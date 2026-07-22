<?php
include('../config/database.php');
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) { exit; }
$admin_id = $_SESSION['user_id']; 

try {
    // Kunin ang lahat ng unique users na nag-message kay admin
    $query = "
        SELECT u.id, u.full_name, u.role, MAX(m.created_at) as last_active 
        FROM messages m
        JOIN users u ON (u.id = m.sender_id OR u.id = m.receiver_id)
        WHERE (m.sender_id = ? OR m.receiver_id = ?) 
          AND u.id != ? 
          AND m.booking_id IS NULL
        GROUP BY u.id
        ORDER BY last_active DESC
    ";
    $stmt = $conn->prepare($query);
    $stmt->bind_param("iii", $admin_id, $admin_id, $admin_id);
    $stmt->execute();
    $res = $stmt->get_result();
    
    $contacts = [];
    while($row = $res->fetch_assoc()){ $contacts[] = $row; }
    echo json_encode($contacts);
} catch (Exception $e) {
    echo json_encode(["error" => $e->getMessage()]);
}
?>