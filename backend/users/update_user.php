<?php
header('Content-Type: application/json');
require_once '../config/database.php';

$id = $_POST['id'];
$role = $_POST['role'];
$status = $_POST['status'];
$spec = $_POST['specialization'];

// Kung hindi technician, i-clear ang specialization
if ($role !== 'technician') { $spec = NULL; }

$sql = "UPDATE users SET role='$role', status='$status', specialization='$spec' WHERE id='$id'";

if ($conn->query($sql)) {
    echo json_encode(['success' => true]);
} else {
    echo json_encode(['success' => false]);
}
?>