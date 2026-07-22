<?php
header('Content-Type: application/json');
require_once '../config/database.php';

// Kunin ang search at filter parameters mula sa URL
$search = isset($_GET['search']) ? $_GET['search'] : '';
$status = isset($_GET['status']) ? $_GET['status'] : 'all';

$sql = "SELECT b.id, u.full_name AS customer, s.service_name, b.booking_date, 
               t.full_name AS technician, b.status 
        FROM bookings b
        LEFT JOIN users u ON b.user_id = u.id
        LEFT JOIN services s ON b.service_id = s.id
        LEFT JOIN users t ON b.technician_id = t.id
        WHERE 1=1";

// Search Logic
if ($search != '') {
    $sql .= " AND u.full_name LIKE '%$search%'";
}

// Filter Logic
if ($status != 'all') {
    $sql .= " AND b.status = '$status'";
}

$sql .= " ORDER BY b.booking_date DESC";

$res = $conn->query($sql);
$bookings = [];

if ($res) {
    while($row = $res->fetch_assoc()) {
        $bookings[] = $row;
    }
}

echo json_encode($bookings);
$conn->close();
?>