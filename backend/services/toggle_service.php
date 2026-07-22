<?php
include('../config/database.php');

$id = $_POST['id'] ?? null;
$status = $_POST['status'] ?? null;

if (!$id || !$status) {
    echo json_encode(["success" => false]);
    exit;
}

$sql = "UPDATE services SET status='$status' WHERE id='$id'";

if (mysqli_query($conn, $sql)) {
    echo json_encode(["success" => true]);
} else {
    echo json_encode(["success" => false]);
}