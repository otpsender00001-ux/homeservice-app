<?php
include('../config/database.php');

$id = $_POST['booking_id'];
$date = $_POST['date'];
$time_start = $_POST['time_start'];
$time_end = $_POST['time_end'];

$sql = "
UPDATE bookings
SET booking_date='$date',
    time_start='$time_start',
    time_end='$time_end',
    status='pending'
WHERE id='$id'
";

mysqli_query($conn, $sql);

echo json_encode(["status"=>"updated"]);