<?php
include('../config/database.php');
session_start();

header('Content-Type: application/json');

if (!isset($_SESSION['user_id']) || $_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(["error" => "Invalid request"]);
    exit;
}

$user_id = $_SESSION['user_id'];
$booking_id = $_POST['booking_id'];
$rating = $_POST['rating'];
$comment = $_POST['comment'] ?? ''; // Optional

try {
    $query = "INSERT INTO reviews (user_id, booking_id, rating, comment) VALUES (?, ?, ?, ?)";
    $stmt = $conn->prepare($query);
    $stmt->bind_param("iiis", $user_id, $booking_id, $rating, $comment);
    
    if($stmt->execute()){
        echo json_encode(["success" => true]);
    } else {
        echo json_encode(["error" => "Failed to save review"]);
    }
} catch (Exception $e) {
    echo json_encode(["error" => $e->getMessage()]);
}
?>