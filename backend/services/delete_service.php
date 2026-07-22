<?php
include('../config/database.php');

$id = $_POST['id'] ?? null;

if (!$id) {
    echo json_encode(["success" => false]);
    exit;
}

$sql = "DELETE FROM services WHERE id='$id'";

if (mysqli_query($conn, $sql)) {
    echo json_encode(["success" => true]);
} else {
    echo json_encode(["success" => false]);
}