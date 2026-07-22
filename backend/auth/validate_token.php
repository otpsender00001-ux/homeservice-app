<?php
// backend/auth/validate_token.php
date_default_timezone_set('Asia/Manila');
header('Content-Type: application/json');
require_once('../config/database.php');

if (isset($_GET['token'])) {
    $token = $_GET['token'];
    $current_time = date("Y-m-d H:i:s");

    // Check if the token is valid and retrieve its expiry time
    $stmt = $conn->prepare("SELECT expiry FROM password_resets WHERE token = ? AND expiry > ? LIMIT 1");
    $stmt->bind_param("ss", $token, $current_time);
    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result->fetch_assoc();

    if ($row) {
        // Token is valid! Return the expiry time for the frontend countdown
        echo json_encode(['status' => 'valid', 'expiry' => $row['expiry']]);
    } else {
        // Token is expired or does not exist
        echo json_encode(['status' => 'invalid']);
    }
} else {
    echo json_encode(['status' => 'invalid']);
}
?>