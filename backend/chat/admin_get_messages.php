<?php

include('../config/database.php');
session_start();

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(["error" => "Unauthorized access."]);
    exit;
}

$admin_id = $_SESSION['user_id'];

if (!isset($_GET['user_id'])) {
    echo json_encode(["error" => "User ID is missing."]);
    exit;
}

$chat_user_id = (int)$_GET['user_id'];

try {

    // =====================================================
    // MARK INCOMING ADMIN CHAT MESSAGES AS READ
    // =====================================================

    $readQuery = "
        UPDATE messages
        SET is_read = 1
        WHERE receiver_id = ?
          AND sender_id = ?
          AND booking_id IS NULL
          AND is_read = 0
    ";

    $readStmt = $conn->prepare($readQuery);
    $readStmt->bind_param(
        "ii",
        $admin_id,
        $chat_user_id
    );

    $readStmt->execute();


    // =====================================================
    // GET CHAT MESSAGES
    // =====================================================

    $query = "
        SELECT 
            m.message,
            m.image,
            m.sender_id,
            m.created_at,
            m.is_read
        FROM messages m
        WHERE m.booking_id IS NULL
          AND (
                (m.sender_id = ? AND m.receiver_id = ?)
                OR
                (m.sender_id = ? AND m.receiver_id = ?)
              )
        ORDER BY m.created_at ASC
    ";

    $stmt = $conn->prepare($query);

    $stmt->bind_param(
        "iiii",
        $admin_id,
        $chat_user_id,
        $chat_user_id,
        $admin_id
    );

    $stmt->execute();

    $res = $stmt->get_result();

    $messages = [];

    while ($row = $res->fetch_assoc()) {

        $row['is_mine'] =
            ($row['sender_id'] == $admin_id) ? 1 : 0;

        $messages[] = $row;
    }

    echo json_encode($messages);

} catch (Exception $e) {

    echo json_encode([
        "error" => $e->getMessage()
    ]);
}
?>