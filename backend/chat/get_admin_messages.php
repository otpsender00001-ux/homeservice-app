<?php
include('../config/database.php');
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(["error" => "Unauthorized access."]);
    exit;
}

$user_id = $_SESSION['user_id'];

try {
    // Hanapin ang ID ng Admin
    $admin_query = $conn->query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
    $admin_id = $admin_query->fetch_assoc()['id'];

    // Kunin lahat ng chat kung saan walang booking_id (NULL) at pagitan ng user na ito at ng admin
    $query = "SELECT m.message, m.image, m.sender_id, m.created_at, u.full_name as sender_name 
              FROM messages m 
              JOIN users u ON m.sender_id = u.id 
              WHERE m.booking_id IS NULL 
              AND ((m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?)) 
              ORDER BY m.created_at ASC";
              
    $stmt = $conn->prepare($query);
    $stmt->bind_param("iiii", $user_id, $admin_id, $admin_id, $user_id);
    $stmt->execute();
    $result = $stmt->get_result();

    $messages = [];
    while ($row = $result->fetch_assoc()) {
        $row['is_mine'] = ($row['sender_id'] == $user_id) ? 1 : 0;
        $messages[] = $row; 
    }

    echo json_encode($messages);
} catch (Exception $e) {
    echo json_encode(["error" => $e->getMessage()]);
}
?>