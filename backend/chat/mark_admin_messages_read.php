<?php

include('../config/database.php');
session_start();

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode([
        "success" => false,
        "message" => "Unauthorized access."
    ]);
    exit;
}

$admin_id = $_SESSION['user_id'];
$sender_id = isset($_POST['user_id']) ? (int)$_POST['user_id'] : 0;

if ($sender_id <= 0) {
    echo json_encode([
        "success" => false,
        "message" => "Invalid user ID."
    ]);
    exit;
}

try {

    $query = "
        UPDATE messages
        SET is_read = 1
        WHERE receiver_id = ?
        AND sender_id = ?
        AND booking_id IS NULL
        AND is_read = 0
    ";

    $stmt = $conn->prepare($query);
    $stmt->bind_param("ii", $admin_id, $sender_id);

    if ($stmt->execute()) {

        echo json_encode([
            "success" => true
        ]);

    } else {

        echo json_encode([
            "success" => false,
            "message" => "Failed to mark messages as read."
        ]);
    }

} catch (Exception $e) {

    echo json_encode([
        "success" => false,
        "message" => $e->getMessage()
    ]);
}
?>