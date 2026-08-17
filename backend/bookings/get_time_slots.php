<?php

include '../config/database.php';

// Philippine Time
date_default_timezone_set('Asia/Manila');

header('Content-Type: application/json');

// Kunin ang date na pinili ng customer
$selected_date = $_GET['date'] ?? '';

if (!$selected_date) {
    echo json_encode([]);
    exit;
}

$current_date = date('Y-m-d');
$current_time = date('H:i:s');


// =====================================================
// 1. GET ALL ADMIN TIME SLOTS
// =====================================================

$sql = "SELECT id, time_start, time_end, max_capacity
        FROM time_slots
        ORDER BY time_start ASC";

$result = $conn->query($sql);

if (!$result) {
    echo json_encode([]);
    exit;
}

$slots = [];

while ($row = $result->fetch_assoc()) {
    $slots[] = $row;
}


// =====================================================
// 2. GET ALL BOOKINGS FOR SELECTED DATE AT ONCE
// =====================================================

$bookingCounts = [];

$countSql = "
    SELECT 
        time_start,
        COUNT(*) AS current_bookings
    FROM bookings
    WHERE booking_date = ?
      AND status != 'cancelled'
    GROUP BY time_start
";

$countStmt = $conn->prepare($countSql);

if ($countStmt) {

    $countStmt->bind_param("s", $selected_date);

    $countStmt->execute();

    $countResult = $countStmt->get_result();

    while ($row = $countResult->fetch_assoc()) {

        $bookingCounts[$row['time_start']] =
            (int)$row['current_bookings'];
    }

    $countStmt->close();
}


// =====================================================
// 3. BUILD AVAILABLE SLOT DATA
// =====================================================

$output = [];

foreach ($slots as $slot) {

    $time_start = $slot['time_start'];
    $time_end = $slot['time_end'];

    $max_capacity = (int)$slot['max_capacity'];

    // Current bookings for this specific date/time
    $current_bookings =
        $bookingCounts[$time_start] ?? 0;


    // =================================================
    // CHECK IF TIME HAS ALREADY PASSED
    // =================================================

    $is_past_time = false;

    if (
        $selected_date === $current_date &&
        $time_start <= $current_time
    ) {
        $is_past_time = true;
    }


    // =================================================
    // CALCULATE REMAINING SLOTS
    // =================================================

    $slots_left =
        max(0, $max_capacity - $current_bookings);


    // =================================================
    // CHECK AVAILABILITY
    // =================================================

    $available =
        ($current_bookings < $max_capacity)
        && !$is_past_time;


    // =================================================
    // FORMAT TIME FOR CUSTOMER
    // =================================================

    $formatted_time =
        date("h:i A", strtotime($time_start))
        . " - " .
        date("h:i A", strtotime($time_end));


    // =================================================
    // RETURN SLOT
    // =================================================

    $output[] = [

        "id" => $slot['id'],

        "time_start" => $time_start,

        "time_end" => $time_end,

        "display_time" => $formatted_time,

        "max_capacity" => $max_capacity,

        "current_bookings" => $current_bookings,

        "available" => $available,

        "slots_left" => $slots_left,

        "is_past_time" => $is_past_time
    ];
}


// =====================================================
// 4. RETURN JSON
// =====================================================

echo json_encode($output);

?>