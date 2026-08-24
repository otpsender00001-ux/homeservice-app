<?php

include('../config/database.php');
session_start();

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode([
        "success" => false,
        "count" => 0
    ]);
    exit;
}

$admin_id = $_SESSION['user_id'];

try {

    $query = "
        SELECT COUNT(*) AS unread_count
        FROM messages
        WHERE receiver_id = ?
        AND booking_id IS NULL
        AND is_read = 0
    ";

    $stmt = $conn->prepare($query);
    $stmt->bind_param("i", $admin_id);
    $stmt->execute();

    $result = $stmt->get_result();
    $row = $result->fetch_assoc();

    echo json_encode([
        "success" => true,
        "count" => (int)$row['unread_count']
    ]);

} catch (Exception $e) {

    echo json_encode([
        "success" => false,
        "count" => 0,
        "error" => $e->getMessage()
    ]);
}
?>