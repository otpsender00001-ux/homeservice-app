<?php
// backend/services/get_services.php
header('Content-Type: application/json');

// 🔒 SECURITY HEADERS
header("X-Content-Type-Options: nosniff");
header("X-Frame-Options: DENY");
header("X-XSS-Protection: 1; mode=block");

include('../config/database.php');

// Kunin ang parameter kung sino ang nagre-request (Admin ba o User)
$view = $_GET['view'] ?? '';

// ⚡ PAGINATION LOGIC (Kung kailangan sa landing page o iba pang view)
$limitQuery = "";
if (isset($_GET['limit'])) {
    $limit = intval($_GET['limit']);
    $offset = isset($_GET['offset']) ? intval($_GET['offset']) : 0;
    
    if ($limit > 0) {
        $limitQuery = " LIMIT $limit OFFSET $offset";
    }
}

// 👑 EXISTING FLOW LOGIC (DINAGDAGAN LANG NG "total_booked" COUNT):
if ($view === 'admin') {
    // 👑 KUNG ADMIN: Kunin lahat ng services (Active at Inactive) para makita sa dashboard kasama ang total bookings
    $sql = "SELECT services.*, 
            (SELECT COUNT(*) FROM bookings WHERE bookings.service_id = services.id AND bookings.status != 'cancelled') AS total_booked 
            FROM services ORDER BY created_at DESC" . $limitQuery;
} else {
    // 👤 KUNG USER: Kunin LANG ang 'active' services para hindi nila makita ang deactivated kasama ang total bookings
    $sql = "SELECT services.*, 
            (SELECT COUNT(*) FROM bookings WHERE bookings.service_id = services.id AND bookings.status != 'cancelled') AS total_booked 
            FROM services WHERE status = 'active' ORDER BY created_at DESC" . $limitQuery;
}

$result = mysqli_query($conn, $sql);

$services = [];

if ($result) {
    while ($row = mysqli_fetch_assoc($result)) {
        $services[] = $row;
    }
}

echo json_encode($services);
?>