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
// GET NOTIFICATION ID
// ========================================

$notification_id = isset($_POST['notification_id'])
    ? intval($_POST['notification_id'])
    : 0;


if ($notification_id <= 0) {

    echo json_encode([
        'success' => false,
        'message' => 'Invalid notification ID'
    ]);

    exit;
}


// ========================================
// MARK AS READ
// ========================================

$sql = "UPDATE notifications
        SET is_read = 1
        WHERE id = ?
        AND user_id = ?";

$stmt = $conn->prepare($sql);

$stmt->bind_param(
    "ii",
    $notification_id,
    $user_id
);

$stmt->execute();


if ($stmt->affected_rows > 0) {

    echo json_encode([
        'success' => true
    ]);

} else {

    echo json_encode([
        'success' => false,
        'message' => 'Notification not found or already read.'
    ]);

}


$stmt->close();

$conn->close();

?>