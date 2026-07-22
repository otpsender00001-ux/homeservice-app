<?php
include('../config/database.php');
session_start();
header('Content-Type: application/json');

$admin_id = $_SESSION['user_id'];
$receiver_id = $_POST['receiver_id'];
$message = $_POST['message'] ?? '';

$imageName = null;
if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
    $uploadDir = '../../uploads/chat/';
    if (!is_dir($uploadDir)) { mkdir($uploadDir, 0777, true); }
    $imageName = time() . '_' . basename($_FILES["image"]["name"]);
    move_uploaded_file($_FILES["image"]["tmp_name"], $uploadDir . $imageName);
}

if (empty($message) && !$imageName) { echo json_encode(["error" => "Empty"]); exit; }

try {
    $query = "INSERT INTO messages (booking_id, sender_id, receiver_id, message, image) VALUES (NULL, ?, ?, ?, ?)";
    $stmt = $conn->prepare($query);
    $stmt->bind_param("iiss", $admin_id, $receiver_id, $message, $imageName);
    
    if($stmt->execute()){ echo json_encode(["success" => true]); } 
    else { echo json_encode(["error" => "Failed"]); }
} catch (Exception $e) {
    echo json_encode(["error" => $e->getMessage()]);
}
?>