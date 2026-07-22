<?php
date_default_timezone_set('Asia/Manila');
header('Content-Type: application/json');
require_once '../config/database.php';

$response = [];

// Kunin ang mga filters
$filter = $_GET['filter'] ?? 'all';
$start_date = $_GET['start_date'] ?? '';
$end_date = $_GET['end_date'] ?? '';

$date_condition = "";

if ($filter === 'daily') {
    $date_condition = " AND DATE(b.created_at) = CURDATE()";
} elseif ($filter === 'weekly') {
    $date_condition = " AND YEARWEEK(b.created_at, 1) = YEARWEEK(CURDATE(), 1)";
} elseif ($filter === 'monthly') {
    $date_condition = " AND YEAR(b.created_at) = YEAR(CURDATE()) AND MONTH(b.created_at) = MONTH(CURDATE())";
} elseif ($filter === 'custom' && $start_date != '' && $end_date != '') {
    $date_condition = " AND DATE(b.created_at) BETWEEN '$start_date' AND '$end_date'";
}

// 1. Total Bookings
$res = $conn->query("SELECT COUNT(*) as total FROM bookings b WHERE 1=1 $date_condition");
$response['total_bookings'] = $res->fetch_assoc()['total'] ?? 0;

// 2. Total Revenue (Join Payments and Bookings)
$res = $conn->query("SELECT SUM(p.amount) as total FROM payments p JOIN bookings b ON p.booking_id = b.id WHERE p.payment_status = 'paid' $date_condition");
$rev_row = $res->fetch_assoc();
$total_revenue_raw = $rev_row['total'] ?? 0;
$response['total_revenue'] = number_format($total_revenue_raw, 2);

// ✨ DAGDAG: Kukunin ang sum ng NAKA-LOCK na Labor Cost sa Database ✨
$res_labor = $conn->query("SELECT SUM(labor_cost_amount) as total_labor FROM bookings b WHERE status = 'completed' $date_condition");
$total_labor_raw = $res_labor->fetch_assoc()['total_labor'] ?? 0;
$response['labor_cost'] = number_format($total_labor_raw, 2);
$response['net_profit'] = number_format($total_revenue_raw - $total_labor_raw, 2);

// 3. Pending Tasks
$res = $conn->query("SELECT COUNT(*) as total FROM bookings b WHERE b.status = 'pending' $date_condition");
$response['pending_tasks'] = $res->fetch_assoc()['total'] ?? 0;

// 4. Active Technicians (Real-time status)
$res = $conn->query("SELECT COUNT(*) as total FROM users WHERE role = 'technician' AND status = 'active'");
$response['active_techs'] = $res->fetch_assoc()['total'] ?? 0;

// 5. Recent Bookings
$sql = "SELECT b.id, u.full_name, s.service_name, b.booking_date, b.total_amount, b.status 
        FROM bookings b
        LEFT JOIN users u ON b.user_id = u.id
        LEFT JOIN services s ON b.service_id = s.id
        WHERE 1=1 $date_condition
        ORDER BY b.created_at DESC LIMIT 5";
$res = $conn->query($sql);

$bookings = [];
while($row = $res->fetch_assoc()) {
    $bookings[] = $row;
}
$response['recent_bookings'] = $bookings;

echo json_encode($response);
$conn->close();
?>