<?php

session_start();

header('Content-Type: application/json');

require_once '../config/database.php';


// ========================================
// CHECK LOGIN
// ========================================

if (!isset($_SESSION['user_id'])) {

    echo json_encode([
        'success' => false,
        'message' => 'Unauthorized'
    ]);

    exit;
}


$user_id = $_SESSION['user_id'];


// ========================================
// GET USER NOTIFICATIONS
// ========================================

$sql = "SELECT 
            id,
            booking_id,
            type,
            title,
            message,
            is_read,
            created_at
        FROM notifications
        WHERE user_id = ?
        ORDER BY created_at DESC";

$stmt = $conn->prepare($sql);

$stmt->bind_param("i", $user_id);

$stmt->execute();

$result = $stmt->get_result();

$notifications = [];

while ($row = $result->fetch_assoc()) {

    $notifications[] = $row;

}

$stmt->close();


// ========================================
// RETURN DATA
// ========================================

echo json_encode([
    'success' => true,
    'notifications' => $notifications
]);


$conn->close();

?>