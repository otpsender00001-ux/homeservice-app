<?php
include('../config/database.php');
session_start();

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(["error" => "Unauthorized"]);
    exit;
}

$user_id = $_SESSION['user_id'];
$booking_id = $_GET['id'] ?? null;

try {
    if ($booking_id) {
        $query = "
        SELECT b.status, s.service_name AS service, u.full_name AS tech_name, u.lat AS tech_lat, u.lng AS tech_lng 
        FROM bookings b 
        LEFT JOIN services s ON b.service_id = s.id 
        LEFT JOIN users u ON b.technician_id = u.id 
        WHERE b.id = ? AND b.user_id = ?";
        
        $stmt = $conn->prepare($query);
        $stmt->bind_param("ii", $booking_id, $user_id);
    } else {
        $query = "
        SELECT b.status, s.service_name AS service, u.full_name AS tech_name, u.lat AS tech_lat, u.lng AS tech_lng 
        FROM bookings b 
        LEFT JOIN services s ON b.service_id = s.id 
        LEFT JOIN users u ON b.technician_id = u.id 
        WHERE b.user_id = ? AND b.status IN ('accepted', 'in_progress') 
        ORDER BY b.created_at DESC LIMIT 1";
        
        $stmt = $conn->prepare($query);
        $stmt->bind_param("i", $user_id);
    }

    $stmt->execute();
    $result = $stmt->get_result();

    if ($row = $result->fetch_assoc()) {
        if ($row['status'] === 'completed' || $row['status'] === 'cancelled') {
            $row['tech_lat'] = null;
            $row['tech_lng'] = null;
        }
        echo json_encode($row);
    } else {
        echo json_encode(["status" => "completed", "message" => "No active tracking"]);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
?>