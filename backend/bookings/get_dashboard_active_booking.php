<?php
include('../config/database.php');
session_start();

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(["error" => "Unauthorized access. Please login."]);
    exit;
}

$user_id = $_SESSION['user_id']; 

try {
    $query = "
    SELECT 
        b.id,
        b.status,
        s.service_name AS service,
        u.full_name AS tech_name,
        u.specialization
    FROM bookings b
    LEFT JOIN services s ON b.service_id = s.id
    LEFT JOIN users u ON b.technician_id = u.id
    WHERE b.user_id = ? AND b.status IN ('pending', 'accepted', 'in_progress')
    ORDER BY b.created_at DESC
    LIMIT 1
    ";

    $stmt = $conn->prepare($query);
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($row = $result->fetch_assoc()) {
        echo json_encode($row);
    } else {
        echo json_encode(["message" => "No active booking"]);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
?>