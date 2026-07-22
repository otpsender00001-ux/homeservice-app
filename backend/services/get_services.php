<?php
include('../config/database.php');

// Kunin ang parameter kung sino ang nagre-request (Admin ba o User)
$view = $_GET['view'] ?? '';

if ($view === 'admin') {
    // 👑 KUNG ADMIN: Kunin lahat ng services (Active at Inactive) para makita sa dashboard
    $sql = "SELECT * FROM services ORDER BY created_at DESC";
} else {
    // 👤 KUNG USER: Kunin LANG ang 'active' services para hindi nila makita ang deactivated
    $sql = "SELECT * FROM services WHERE status = 'active' ORDER BY created_at DESC";
}

$result = mysqli_query($conn, $sql);

$services = [];

while ($row = mysqli_fetch_assoc($result)) {
    $services[] = $row;
}

echo json_encode($services);
?>