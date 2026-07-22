<?php
header('Content-Type: application/json');
include '../config/database.php';

$booking_id = $_GET['booking_id'] ?? null;

if (!$booking_id) {
    echo json_encode(['success' => false, 'message' => 'Missing Booking ID']);
    exit;
}

// I-join ang bookings at users para makuha ang location ng assigned technician
$sql = "SELECT u.lat, u.lng, u.full_name, b.status 
        FROM bookings b 
        JOIN users u ON b.technician_id = u.id 
        WHERE b.id = ?";

$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $booking_id);
$stmt->execute();
$result = $stmt->get_result();

if ($row = $result->fetch_assoc()) {
    // 🛡️ PRO FIX: Privacy Logic - Kapag tapos na ang job, i-null ang location
    if ($row['status'] === 'completed' || $row['status'] === 'cancelled') {
        $row['lat'] = null;
        $row['lng'] = null;
    }

    echo json_encode([
        'success' => true,
        'lat' => $row['lat'] !== null ? (float)$row['lat'] : null,
        'lng' => $row['lng'] !== null ? (float)$row['lng'] : null,
        'tech_name' => $row['full_name'],
        'status' => $row['status']
    ]);
} else {
    echo json_encode(['success' => false, 'message' => 'No technician assigned or active.']);
}
?>