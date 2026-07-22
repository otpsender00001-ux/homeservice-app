<?php
// FIX: Set timezone to match local time
date_default_timezone_set('Asia/Manila');

header('Content-Type: application/json');
require_once('../config/database.php');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $token = $_POST['token'];
    $new_password = $_POST['password'];
    
    // Get the exact current time via PHP
    $current_time = date("Y-m-d H:i:s");

    // 1. Check if the token is valid and not yet expired
    $stmt = $conn->prepare("SELECT email FROM password_resets WHERE token = ? AND expiry > ? LIMIT 1");
    $stmt->bind_param("ss", $token, $current_time);
    $stmt->execute();
    $result = $stmt->get_result();
    $reset_request = $result->fetch_assoc();

    if ($reset_request) {
        $email = $reset_request['email'];
        
        // Hash the new password securely
        $hashed_password = password_hash($new_password, PASSWORD_DEFAULT);

        // 2. Update the user's password in the database
        $stmt = $conn->prepare("UPDATE users SET password = ? WHERE email = ?");
        $stmt->bind_param("ss", $hashed_password, $email);
        $stmt->execute();

        // 3. Delete the used token to prevent reuse (Security best practice)
        $stmt = $conn->prepare("DELETE FROM password_resets WHERE email = ?");
        $stmt->bind_param("s", $email);
        $stmt->execute();

        echo json_encode(['status' => 'success', 'message' => 'Password updated successfully! You may now log in.']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Invalid or expired reset token.']);
    }
}
?>