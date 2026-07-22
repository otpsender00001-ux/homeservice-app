<?php
date_default_timezone_set('Asia/Manila');
include('../config/database.php');
session_start();

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(["error" => "Unauthorized access."]);
    exit;
}

$tech_id = $_SESSION['user_id']; 
$filter = $_GET['filter'] ?? 'all';
$startDate = $_GET['startDate'] ?? null;
$endDate = $_GET['endDate'] ?? null;

// Base condition for filtering
$dateCondition = "";
if ($filter === 'daily') {
    $dateCondition = " AND DATE(booking_date) = CURDATE()";
} elseif ($filter === 'weekly') {
    $dateCondition = " AND YEARWEEK(booking_date, 1) = YEARWEEK(CURDATE(), 1)";
} elseif ($filter === 'monthly') {
    $dateCondition = " AND MONTH(booking_date) = MONTH(CURDATE()) AND YEAR(booking_date) = YEAR(CURDATE())";
} elseif ($filter === 'custom' && $startDate && $endDate) {
    $dateCondition = " AND booking_date BETWEEN '$startDate' AND '$endDate'";
}

try {
    $stats = [
        "jobs_today" => 0,
        "completed_jobs" => 0,
        "earnings_today" => 0,
        "avg_rating" => 0
    ];

    // 1. Get Jobs (Filtered)
    $query1 = "SELECT COUNT(*) as count FROM bookings WHERE technician_id = ?" . $dateCondition;
    $stmt1 = $conn->prepare($query1);
    $stmt1->bind_param("i", $tech_id);
    $stmt1->execute();
    $stats['jobs_today'] = $stmt1->get_result()->fetch_assoc()['count'];

    // 2. Total Completed Jobs (All time - Hindi ito nadedepende sa filter para makita ang progress)
    $query2 = "SELECT COUNT(*) as count FROM bookings WHERE technician_id = ? AND status = 'completed'";
    $stmt2 = $conn->prepare($query2);
    $stmt2->bind_param("i", $tech_id);
    $stmt2->execute();
    $stats['completed_jobs'] = $stmt2->get_result()->fetch_assoc()['count'];

    // 3. Earnings (Filtered and with 70% labor rate)
    $query3 = "SELECT SUM(total_amount) as total FROM bookings WHERE technician_id = ? AND status = 'completed'" . $dateCondition;
    $stmt3 = $conn->prepare($query3);
    $stmt3->bind_param("i", $tech_id);
    $stmt3->execute();
    $res3 = $stmt3->get_result()->fetch_assoc();
    $total_collected = $res3['total'] ? (float)$res3['total'] : 0;

    $labor_rate = 0.70; 
    $stats['earnings_today'] = $total_collected * $labor_rate;

    // 4. Average Rating computation
    $query4 = "SELECT AVG(r.rating) as avg_rating FROM reviews r JOIN bookings b ON r.booking_id = b.id WHERE b.technician_id = ?";
    $stmt4 = $conn->prepare($query4);
    $stmt4->bind_param("i", $tech_id);
    $stmt4->execute();
    $res4 = $stmt4->get_result()->fetch_assoc();
    $stats['avg_rating'] = $res4['avg_rating'] ? (float)$res4['avg_rating'] : 0;

    echo json_encode($stats);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
?>