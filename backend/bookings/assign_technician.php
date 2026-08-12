<?php

header('Content-Type: application/json');
require_once '../config/database.php';

$b_id = $_POST['booking_id'] ?? null;
$action = $_POST['action'] ?? 'assign';

if (!$b_id) {
    echo json_encode([
        'success' => false,
        'message' => 'Missing Booking ID'
    ]);
    exit;
}


/*
========================================
🔴 ADMIN CANCEL BOOKING
========================================
*/

if ($action === 'cancel') {

    $reason = trim($_POST['reason'] ?? '');

    if ($reason === '') {
        echo json_encode([
            'success' => false,
            'message' => 'Cancellation reason is required.'
        ]);
        exit;
    }


    /*
    Get the user who owns this booking.
    We need the user_id because the notification
    belongs to that customer.
    */

    $getBooking = $conn->prepare("
        SELECT user_id
        FROM bookings
        WHERE id = ?
    ");

    $getBooking->bind_param("i", $b_id);
    $getBooking->execute();

    $bookingResult = $getBooking->get_result();

    if ($bookingResult->num_rows === 0) {

        echo json_encode([
            'success' => false,
            'message' => 'Booking not found.'
        ]);

        $getBooking->close();
        $conn->close();
        exit;
    }

    $booking = $bookingResult->fetch_assoc();

    $user_id = $booking['user_id'];

    $getBooking->close();


    /*
    Update booking status + cancellation reason
    */

    $sql = "
        UPDATE bookings
        SET
            status = 'cancelled',
            cancellation_reason = ?
        WHERE id = ?
    ";

    $stmt = $conn->prepare($sql);

    $stmt->bind_param("si", $reason, $b_id);


    if ($stmt->execute()) {

        /*
        ========================================
        🔔 CREATE NOTIFICATION
        ========================================
        */

        $title = "Booking Cancelled";

        $message = "Your booking has been cancelled. Reason: " . $reason;

        $notificationType = "cancelled";


        $notificationSQL = "
            INSERT INTO notifications
            (
                user_id,
                booking_id,
                type,
                title,
                message,
                is_read
            )
            VALUES (?, ?, ?, ?, ?, 0)
        ";

        $notificationStmt = $conn->prepare($notificationSQL);

        $notificationStmt->bind_param(
            "iisss",
            $user_id,
            $b_id,
            $notificationType,
            $title,
            $message
        );

        $notificationStmt->execute();

        $notificationStmt->close();


        echo json_encode([
            'success' => true,
            'message' => 'Booking cancelled successfully.'
        ]);

    } else {

        echo json_encode([
            'success' => false,
            'message' => 'Failed to cancel booking.'
        ]);
    }

    $stmt->close();

}


/*
========================================
🟢 ADMIN ACCEPT / ASSIGN TECHNICIAN
========================================
*/

else {

    $t_id = $_POST['technician_id'] ?? null;

    if (!$t_id) {

        echo json_encode([
            'success' => false,
            'message' => 'Missing Technician ID'
        ]);

        exit;
    }


    /*
    Get customer/user ID first
    */

    $getBooking = $conn->prepare("
        SELECT user_id
        FROM bookings
        WHERE id = ?
    ");

    $getBooking->bind_param("i", $b_id);
    $getBooking->execute();

    $bookingResult = $getBooking->get_result();

    if ($bookingResult->num_rows === 0) {

        echo json_encode([
            'success' => false,
            'message' => 'Booking not found.'
        ]);

        $getBooking->close();
        $conn->close();
        exit;
    }

    $booking = $bookingResult->fetch_assoc();

    $user_id = $booking['user_id'];

    $getBooking->close();


    /*
    Assign technician + accept booking
    */

    $sql = "
        UPDATE bookings
        SET
            technician_id = ?,
            status = 'accepted'
        WHERE id = ?
    ";

    $stmt = $conn->prepare($sql);

    $stmt->bind_param("ii", $t_id, $b_id);


    if ($stmt->execute()) {

        /*
        ========================================
        🔔 CREATE ACCEPTED NOTIFICATION
        ========================================
        */

        $title = "Booking Accepted";

        $message = "Your booking has been accepted and a technician has been assigned.";

        $notificationType = "accepted";


        $notificationSQL = "
            INSERT INTO notifications
            (
                user_id,
                booking_id,
                type,
                title,
                message,
                is_read
            )
            VALUES (?, ?, ?, ?, ?, 0)
        ";

        $notificationStmt = $conn->prepare($notificationSQL);

        $notificationStmt->bind_param(
            "iisss",
            $user_id,
            $b_id,
            $notificationType,
            $title,
            $message
        );

        $notificationStmt->execute();

        $notificationStmt->close();


        echo json_encode([
            'success' => true,
            'message' => 'Technician assigned successfully.'
        ]);

    } else {

        echo json_encode([
            'success' => false,
            'message' => 'Failed to assign technician.'
        ]);
    }

    $stmt->close();
}


$conn->close();

?>