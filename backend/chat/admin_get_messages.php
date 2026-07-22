<?php
include('../config/database.php');
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(["error" => "Unauthorized access."]);
    exit;
}

$admin_id = $_SESSION['user_id'];
$chat_user_id = $_GET['user_id'];

try {
    $query = "SELECT m.message, m.image, m.sender_id, m.created_at 
              FROM messages m 
              WHERE m.booking_id IS NULL 
              AND ((m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?)) 
              ORDER BY m.created_at ASC";
              
    $stmt = $conn->prepare($query);
    $stmt->bind_param("iiii", $admin_id, $chat_user_id, $chat_user_id, $admin_id);
    $stmt->execute();
    
    // 🛠️ FIX: Ito yung part na may typo kanina. Dapat $res parehas.
    $res = $stmt->get_result();

    $messages = [];
    while ($row = $res->fetch_assoc()) { 
        $row['is_mine'] = ($row['sender_id'] == $admin_id) ? 1 : 0;
        $messages[] = $row; 
    }
    
    echo json_encode($messages);
} catch (Exception $e) {
    echo json_encode(["error" => $e->getMessage()]);
}
?>