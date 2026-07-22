<?php
header('Content-Type: application/json');
require_once '../config/database.php';

$search = $_GET['search'] ?? '';
$role = $_GET['role'] ?? 'all';

// Idinagdag ang lat at lng sa selection
$sql = "SELECT id, full_name, email, role, phone, specialization, status, lat, lng FROM users WHERE 1=1";

if ($search != '') {
    $search = $conn->real_escape_string($search); // Proteksyon sa SQL Injection
    $sql .= " AND (full_name LIKE '%$search%' OR email LIKE '%$search%')";
}
if ($role != 'all') {
    $role = $conn->real_escape_string($role);
    $sql .= " AND role = '$role'";
}

$res = $conn->query($sql);
$users = [];
while($row = $res->fetch_assoc()) { 
    $users[] = $row; 
}
echo json_encode($users);
?>