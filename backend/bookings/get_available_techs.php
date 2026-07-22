<?php
header('Content-Type: application/json');
require_once '../config/database.php';

$service = $_GET['service'];

// Kukunin ang techs na: 1. Active, 2. Match ang Specialization, 3. Walang in_progress na trabaho
$sql = "SELECT id, full_name FROM users 
        WHERE role = 'technician' 
        AND status = 'active' 
        AND specialization = '$service'
        AND id NOT IN (SELECT technician_id FROM bookings WHERE status = 'in_progress' AND technician_id IS NOT NULL)";

$res = $conn->query($sql);
$techs = [];
while($row = $res->fetch_assoc()) { $techs[] = $row; }

echo json_encode($techs);
$conn->close();
?>