<?php
include('../config/database.php');
session_start();

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(["error" => "Unauthorized access. Please login."]);
    exit;
}

$user_id = $_SESSION['user_id']; 
$status_filter = $_GET['status'] ?? 'all';

try {
    // 🛠️ UPGRADED: Dinagdag ang r.rating AS user_rating para makuha ang eksaktong stars
    $query = "
    SELECT 
        b.id,
        b.status,
        b.booking_date,
        b.time_start AS booking_time,
        s.service_name AS service,
        u.full_name AS tech_name,
        IF(r.id IS NOT NULL, 1, 0) AS is_rated,
        r.rating AS user_rating
    FROM bookings b
    LEFT JOIN services s ON b.service_id = s.id
    LEFT JOIN users u ON b.technician_id = u.id
    LEFT JOIN reviews r ON b.id = r.booking_id
    WHERE b.user_id = ?
    ";

    if ($status_filter !== 'all') {
        $query .= " AND b.status = ?";
    }

    $query .= " ORDER BY b.created_at DESC";

    $stmt = $conn->prepare($query);

    if ($status_filter !== 'all') {
        $stmt->bind_param("is", $user_id, $status_filter);
    } else {
        $stmt->bind_param("i", $user_id);
    }

    $stmt->execute();
    $result = $stmt->get_result();

    $bookings = [];
    while ($row = $result->fetch_assoc()) {
        $bookings[] = $row; 
    }

    echo json_encode($bookings);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
?>