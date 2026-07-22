<?php
include('../config/database.php');
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['user_id']) || $_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(["error" => "Unauthorized access."]);
    exit;
}

$user_id = $_SESSION['user_id'];
$booking_id = $_POST['booking_id'];
$message = $_POST['message'] ?? '';

// 📷 ADDED: IMAGE UPLOAD LOGIC
$imageName = null;
if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
    $uploadDir = '../../uploads/chat/';
    if (!is_dir($uploadDir)) { mkdir($uploadDir, 0777, true); }
    $imageName = time() . '_' . basename($_FILES["image"]["name"]);
    move_uploaded_file($_FILES["image"]["tmp_name"], $uploadDir . $imageName);
}

// Bawal mag-send ng walang text AT walang image
if (empty($message) && !$imageName) {
    echo json_encode(["error" => "Cannot send empty message."]);
    exit;
}

try {
    $stmt = $conn->prepare("SELECT user_id, technician_id FROM bookings WHERE id = ?");
    $stmt->bind_param("i", $booking_id);
    $stmt->execute();
    $booking = $stmt->get_result()->fetch_assoc();
    
    $receiver_id = ($user_id == $booking['user_id']) ? $booking['technician_id'] : $booking['user_id'];

    // 🛠️ UPGRADED: Kasama na ang image column
    $query = "INSERT INTO messages (booking_id, sender_id, receiver_id, message, image) VALUES (?, ?, ?, ?, ?)";
    $insert_stmt = $conn->prepare($query);
    $insert_stmt->bind_param("iiiss", $booking_id, $user_id, $receiver_id, $message, $imageName);
    
    if($insert_stmt->execute()){
        echo json_encode(["success" => true]);
    } else {
        echo json_encode(["error" => "Failed to send message"]);
    }
} catch (Exception $e) {
    echo json_encode(["error" => $e->getMessage()]);
}
?>