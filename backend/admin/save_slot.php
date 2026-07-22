<?php
include '../config/database.php';

$start = $_POST['time_start'];
$end = $_POST['time_end'];
$cap = $_POST['max_capacity'];

// Dahil ang gusto mo ay reusable slots (kahit anong date), 
// i-check muna natin kung may kaparehong oras na
$check = $conn->prepare("SELECT id FROM time_slots WHERE time_start = ? AND time_end = ?");
$check->bind_param("ss", $start, $end);
$check->execute();
if ($check->get_result()->num_rows > 0) {
    echo json_encode(["status" => "error", "message" => "Time slot already exists!"]);
    exit;
}

$sql = "INSERT INTO time_slots (time_start, time_end, max_capacity) VALUES (?, ?, ?)";
$stmt = $conn->prepare($sql);
$stmt->bind_param("ssi", $start, $end, $cap);

if ($stmt->execute()) {
    echo json_encode(["status" => "success"]);
} else {
    echo json_encode(["status" => "error"]);
}
?>