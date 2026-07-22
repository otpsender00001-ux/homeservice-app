<?php
include '../config/database.php';

// I-update ang capacity para sa lahat ng future slots o specific slot
if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $new_capacity = $_POST['max_capacity'];
    
    // Option A: Update global capacity (Lahat ng existing slots)
    $sql = "UPDATE time_slots SET max_capacity = ? WHERE slot_date >= CURDATE()";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $new_capacity);
    
    if ($stmt->execute()) {
        echo json_encode(["status" => "success", "message" => "Slots updated successfully!"]);
    } else {
        echo json_encode(["status" => "error", "message" => "Failed to update slots"]);
    }
}
?>