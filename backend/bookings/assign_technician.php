<?php
header('Content-Type: application/json');
require_once '../config/database.php';

$b_id = $_POST['booking_id'] ?? null;
// ✨ DAGDAG: Babasahin natin kung "assign" o "cancel" ang gusto mong gawin
$action = $_POST['action'] ?? 'assign'; 

if (!$b_id) {
    echo json_encode(['success' => false, 'message' => 'Missing Booking ID']);
    exit;
}

if ($action === 'cancel') {
    // 🔴 KUNG CANCEL: Ibahin ang status lang, walang Technician ID
    $sql = "UPDATE bookings SET status = 'cancelled' WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $b_id);
    
    if ($stmt->execute()) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false]);
    }
    $stmt->close();
    
} else {
    // 🟢 KUNG ASSIGN: (Ito yung original mong logic, ginamitan lang ng prepare para mas safe)
    $t_id = $_POST['technician_id'] ?? null;
    if (!$t_id) {
        echo json_encode(['success' => false, 'message' => 'Missing Technician ID']);
        exit;
    }

    $sql = "UPDATE bookings SET technician_id = ?, status = 'accepted' WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ii", $t_id, $b_id);

    if ($stmt->execute()) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false]);
    }
    $stmt->close();
}

$conn->close();
?>