<?php
include '../config/database.php';

// Kunin ang date na pinili ng user sa frontend
$selected_date = $_GET['date']; 

// Kunin lahat ng slots na ginawa mo sa Admin
$sql = "SELECT * FROM time_slots ORDER BY time_start ASC";
$result = $conn->query($sql);

$slots = [];

while ($row = $result->fetch_assoc()) {
    $time_start = $row['time_start'];
    $max_capacity = $row['max_capacity'];

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
        "available" => ($current_bookings < $max_capacity),
        "slots_left" => ($max_capacity - $current_bookings)
    ];
}

echo json_encode($slots);
?>