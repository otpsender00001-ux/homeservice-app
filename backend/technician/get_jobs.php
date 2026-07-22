<?php
header('Content-Type: application/json');
require_once '../config/database.php';

// Siguraduhin na may tech_id na pinasa
if (!isset($_GET['tech_id'])) {
    echo json_encode(["error" => "No technician ID provided"]);
    exit;
}

// I-sanitize ang input para iwas SQL Injection
$tech_id = $conn->real_escape_string($_GET['tech_id']);

// Kuhanin ang bookings kasama ang Address, Schedule, at Customer Details
// GINAMIT NATIN ANG b.phone (mula sa bookings table) SA HALIP NA u.phone
$sql = "SELECT 
            b.id, 
            u.full_name as customer, 
            b.phone as customer_phone, 
            s.service_name, 
            b.status, 
            b.address, 
            b.booking_date, 
            b.time_start, 
            b.time_end, 
            b.notes 
        FROM bookings b
        JOIN users u ON b.user_id = u.id
        JOIN services s ON b.service_id = s.id
        WHERE b.technician_id = '$tech_id' 
        AND b.status NOT IN ('completed', 'cancelled')";

$res = $conn->query($sql);
$jobs = [];

if ($res) {
    while($row = $res->fetch_assoc()) { 
        $jobs[] = $row; 
    }
}

echo json_encode($jobs); 
?>