<?php
include '../config/database.php';

// I-set ang timezone para sakto sa oras ng Pilipinas
date_default_timezone_set('Asia/Manila');

// Kunin ang date na pinili ng user sa frontend
$selected_date = $_GET['date']; 
$current_date = date('Y-m-d');
$current_time = date('H:i:s');

// Kunin lahat ng slots na ginawa mo sa Admin
$sql = "SELECT * FROM time_slots ORDER BY time_start ASC";
$result = $conn->query($sql);

$slots = [];

while ($row = $result->fetch_assoc()) {
    $time_start = $row['time_start'];
    $max_capacity = $row['max_capacity'];

    // 👉 DAGDAG: I-check kung ang oras ay tapos na kung TODAY ang booking
    $is_past_time = false;
    if ($selected_date == $current_date && $time_start <= $current_time) {
        $is_past_time = true; // True ibig sabihin, hindi na pwede i-book
    }

    // Bilangin kung ilan na ang naka-book sa SPECIFIC DATE at TIME na ito
    $check_sql = "SELECT COUNT(*) as current_bookings FROM bookings 
                  WHERE booking_date = ? 
                  AND time_start = ? 
                  AND status != 'cancelled'";
    
    $stmt = $conn->prepare($check_sql);
    $stmt->bind_param("ss", $selected_date, $time_start);
    $stmt->execute();
    $count_res = $stmt->get_result()->fetch_assoc();
    $current_bookings = $count_res['current_bookings'];

    // I-format ang oras para maganda tignan (e.g., 01:00 PM)
    $formatted_time = date("h:i A", strtotime($row['time_start'])) . " - " . date("h:i A", strtotime($row['time_end']));

    $slots[] = [
        "time_start" => $row['time_start'],
        "time_end" => $row['time_end'],
        "display_time" => $formatted_time,
        // 👉 Kung lumipas na ang oras, idi-disable niya sa pagiging "available"
        "available" => ($current_bookings < $max_capacity && !$is_past_time),
        "slots_left" => ($max_capacity - $current_bookings)
    ];
}

echo json_encode($slots);
?>