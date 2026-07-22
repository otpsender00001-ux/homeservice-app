<?php
include('../config/database.php');
session_start();

$user_id = $_SESSION['user_id'] ?? 1;

$service_id = $_POST['service_id'];
$date = $_POST['date'];
$time_start = $_POST['time_start'];
$time_end = $_POST['time_end'];
$address = $_POST['address']; // Nakuha na ang address
$phone = $_POST['phone']; // DAGDAG: Kinuha na natin ang phone number
$total_amount = $_POST['total_amount']; // Nakuha na ang price

# CHECK IF FULL (Limit 3 bookings per slot)
$check = "
SELECT COUNT(*) as total
FROM bookings
WHERE booking_date = '$date'
AND time_start = '$time_start'
AND status != 'cancelled'
";

$res = mysqli_query($conn, $check);
$row = mysqli_fetch_assoc($res);

if($row['total'] >= 3){
    echo json_encode(["status" => "full"]);
    exit;
}

# INSERT WITH PRICE AND ADDRESS AND PHONE
$sql = "
INSERT INTO bookings (user_id, service_id, booking_date, time_start, time_end, address, phone, total_amount, status)
VALUES ('$user_id', '$service_id', '$date', '$time_start', '$time_end', '$address', '$phone', '$total_amount', 'pending')
";

if(mysqli_query($conn, $sql)){
    echo json_encode(["status" => "success"]);
} else {
    echo json_encode(["status" => "error", "message" => mysqli_error($conn)]);
}
?>