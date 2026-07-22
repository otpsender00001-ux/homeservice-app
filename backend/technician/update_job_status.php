<?php
header('Content-Type: application/json');
require_once '../config/database.php';

// Kunin ang data mula sa POST
$booking_id = $_POST['booking_id'] ?? null;
$status = $_POST['status'] ?? null; 

if (!$booking_id || !$status) {
    echo json_encode(['success' => false, 'message' => 'Missing parameters']);
    exit;
}

/**
 * TANDAAN: 
 * Sa technician JS mo (tech-jobs.js), siguraduhin na 'in_progress' 
 * ang ipinapasa kapag pinindot ang 'Start Travel'.
 */

// Gumamit ng Prepared Statement para sa security
$sql = "UPDATE bookings SET status = ? WHERE id = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("si", $status, $booking_id);

if ($stmt->execute()) {
    
    // ==========================================
    // DAGDAG NA CODE PARA PUMASOK SA PAYMENTS AT DASHBOARD (No existing codes removed!)
    // ==========================================
    if ($status === 'completed') {
        // 1. Kunin ang total_amount sa bookings table
        $amt_sql = "SELECT total_amount FROM bookings WHERE id = ?";
        $amt_stmt = $conn->prepare($amt_sql);
        $amt_stmt->bind_param("i", $booking_id);
        $amt_stmt->execute();
        $amt_res = $amt_stmt->get_result();

        if ($amt_row = $amt_res->fetch_assoc()) {
            $amount = $amt_row['total_amount'];

            // ✨ DAGDAG: I-save ang Labor Cost Amount para maging permanent (Locked) ✨
            // Babasahin nito ang rate na gusto mo i-apply sa bagong booking
            $current_rate = 0.70; // 70% rate
            $locked_labor = $amount * $current_rate;
            
            $save_labor_sql = "UPDATE bookings SET labor_cost_amount = ? WHERE id = ?";
            $sl_stmt = $conn->prepare($save_labor_sql);
            $sl_stmt->bind_param("di", $locked_labor, $booking_id);
            $sl_stmt->execute();
            $sl_stmt->close();

            // 2. I-check kung may record na sa payments table para hindi mag-doble
            $check_pay_sql = "SELECT id FROM payments WHERE booking_id = ?";
            $check_pay_stmt = $conn->prepare($check_pay_sql);
            $check_pay_stmt->bind_param("i", $booking_id);
            $check_pay_stmt->execute();
            $check_pay_res = $check_pay_stmt->get_result();

            if ($check_pay_res->num_rows == 0) {
                // Wala pang payment record, kaya mag-insert tayo ng bago na 'paid' na
                $insert_pay_sql = "INSERT INTO payments (booking_id, amount, payment_method, payment_status) VALUES (?, ?, 'cash', 'paid')";
                $insert_pay_stmt = $conn->prepare($insert_pay_sql);
                $insert_pay_stmt->bind_param("id", $booking_id, $amount);
                $insert_pay_stmt->execute();
                $insert_pay_stmt->close();
            } else {
                // May record na pala, i-update na lang natin to 'paid'
                $update_pay_sql = "UPDATE payments SET payment_status = 'paid' WHERE booking_id = ?";
                $update_pay_stmt = $conn->prepare($update_pay_sql);
                $update_pay_stmt->bind_param("i", $booking_id);
                $update_pay_stmt->execute();
                $update_pay_stmt->close();
            }
            $check_pay_stmt->close();
        }
        $amt_stmt->close();
    }
    // ==========================================
    // END NG DAGDAG NA CODE
    // ==========================================

    echo json_encode([
        'success' => true, 
        'new_status' => $status
    ]);
} else {
    echo json_encode([
        'success' => false, 
        'error' => $conn->error
    ]);
}

$stmt->close();
$conn->close();
?>