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

// 0. Kunin ang System Settings (Daily vs Percentage mode)
$settings = [];
$res_settings = $conn->query("SELECT setting_key, setting_value FROM system_settings");
if ($res_settings) {
    while ($s_row = $res_settings->fetch_assoc()) {
        $settings[$s_row['setting_key']] = $s_row['setting_value'];
    }
}

$cost_mode = $settings['cost_mode'] ?? 'percentage';
$labor_percentage = floatval($settings['labor_percentage'] ?? 30);
$daily_rate = floatval($settings['daily_rate'] ?? 800);

// Isama ang system config sa response para magamit ng frontend JavaScript UI
$response['config'] = [
    'mode' => $cost_mode,
    'percentage' => $labor_percentage,
    'daily_rate' => $daily_rate
];

// 1. Total Bookings
$res = $conn->query("SELECT COUNT(*) as total FROM bookings b WHERE 1=1 $date_condition");
$response['total_bookings'] = $res->fetch_assoc()['total'] ?? 0;

// 2. Total Revenue (Join Payments and Bookings)
$res = $conn->query("SELECT SUM(p.amount) as total FROM payments p JOIN bookings b ON p.booking_id = b.id WHERE p.payment_status = 'paid' $date_condition");
$rev_row = $res->fetch_assoc();
$total_revenue_raw = floatval($rev_row['total'] ?? 0);
$response['total_revenue'] = number_format($total_revenue_raw, 2);

// 3. Labor Cost at Net Profit Computation (Arawan vs Percentage Logic)
if ($cost_mode === 'daily') {
    // Daily Salary Mode: (Bilang ng natapos na booking/job) x (Daily Rate na ₱800)
    $res_completed = $conn->query("SELECT COUNT(*) as total_completed FROM bookings b WHERE b.status = 'completed' $date_condition");
    $completed_count = intval($res_completed->fetch_assoc()['total_completed'] ?? 0);
    
    $total_labor_raw = $completed_count * $daily_rate;
} else {
    // Percentage Mode: Kukunin ang sum ng naka-lock na Labor Cost
    $res_labor = $conn->query("SELECT SUM(labor_cost_amount) as total_labor FROM bookings b WHERE b.status = 'completed' $date_condition");
    $total_labor_raw = floatval($res_labor->fetch_assoc()['total_labor'] ?? 0);
    
    // Fallback kung hindi pa naka-lock ang labor cost sa database column
    if ($total_labor_raw == 0 && $total_revenue_raw > 0) {
        $total_labor_raw = $total_revenue_raw * ($labor_percentage / 100);
    }
}

$response['labor_cost'] = number_format($total_labor_raw, 2);
$response['net_profit'] = number_format($total_revenue_raw - $total_labor_raw, 2);

// 4. Pending Tasks
$res = $conn->query("SELECT COUNT(*) as total FROM bookings b WHERE b.status = 'pending' $date_condition");
$response['pending_tasks'] = $res->fetch_assoc()['total'] ?? 0;

// 5. Active Technicians (Real-time status)
$res = $conn->query("SELECT COUNT(*) as total FROM users WHERE role = 'technician' AND status = 'active'");
$response['active_techs'] = $res->fetch_assoc()['total'] ?? 0;

// 6. Recent Bookings
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