<?php
include_once '../config/database.php';
session_start();

// Siguraduhin na ang technician ay logged in
if (!isset($_SESSION['user_id'])) {
    echo json_encode(["status" => "error", "message" => "Unauthorized"]);
    exit;
}

// Kunin ang JSON data mula sa fetch body
$data = json_decode(file_get_contents("php://input"));

// 🛡️ PRO FIX: Pinalitan ang !empty ng property_exists para ma-detect kahit null ang pinasa
if ($data && property_exists($data, 'lat') && property_exists($data, 'lng')) {
    $user_id = $_SESSION['user_id'];
    $lat = $data->lat;
    $lng = $data->lng;

    // 🛡️ PRO FIX: Kung null ang lat at lng, burahin ang location sa DB (Wipe Tracker)
    if ($lat === null || $lng === null) {
        $query = "UPDATE users SET lat = NULL, lng = NULL WHERE id = ?";
        $stmt = $conn->prepare($query);
        $stmt->bind_param("i", $user_id);
    } else {
        // Gamit ang mysqli prepare at bind_param para sa security
        $query = "UPDATE users SET lat = ?, lng = ? WHERE id = ?";
        $stmt = $conn->prepare($query);
        $stmt->bind_param("ddi", $lat, $lng, $user_id);
    }
    
    if ($stmt->execute()) {
        echo json_encode(["status" => "success"]);
    } else {
        echo json_encode(["status" => "error", "message" => $conn->error]);
    }
    
    $stmt->close();
} else {
    echo json_encode(["status" => "error", "message" => "Missing coordinates payload"]);
}
?>