<?php
include('../config/database.php');
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['user_id']) || $_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(["error" => "Unauthorized access."]);
    exit;
}

$user_id = $_SESSION['user_id'];
$message = $_POST['message'] ?? '';

// 📷 IMAGE UPLOAD LOGIC
$imageName = null;
if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
    $uploadDir = '../../uploads/chat/';
    if (!is_dir($uploadDir)) { mkdir($uploadDir, 0777, true); }
    $imageName = time() . '_' . basename($_FILES["image"]["name"]);
    move_uploaded_file($_FILES["image"]["tmp_name"], $uploadDir . $imageName);
}

if (empty($message) && !$imageName) {
    echo json_encode(["error" => "Cannot send empty message."]);
    exit;
}

try {
    // Hanapin ang ID ng Admin sa database (role = 'admin')
    $admin_query = $conn->query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
    if($admin_query->num_rows === 0) {
        echo json_encode(["error" => "No admin found in the system."]);
        exit;
    }
    $admin_id = $admin_query->fetch_assoc()['id'];

    // I-insert ang chat. Pansinin na NULL ang booking_id dahil admin chat ito
    $query = "INSERT INTO messages (booking_id, sender_id, receiver_id, message, image) VALUES (NULL, ?, ?, ?, ?)";
    $insert_stmt = $conn->prepare($query);
    $insert_stmt->bind_param("iiss", $user_id, $admin_id, $message, $imageName);
    
    if($insert_stmt->execute()){
        echo json_encode(["success" => true]);
    } else {
        echo json_encode(["error" => "Failed to send message"]);
    }
} catch (Exception $e) {
    echo json_encode(["error" => $e->getMessage()]);
}
?>