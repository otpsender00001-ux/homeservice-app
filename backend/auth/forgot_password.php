<?php
// FIX: Set timezone to match local time to avoid database mismatches
date_default_timezone_set('Asia/Manila');

header('Content-Type: application/json');
require_once('../config/database.php');

// Include PHPMailer classes
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require '../../includes/PHPMailer/src/Exception.php';
require '../../includes/PHPMailer/src/PHPMailer.php';
require '../../includes/PHPMailer/src/SMTP.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = filter_var($_POST['email'], FILTER_SANITIZE_EMAIL);

    // 1. Check if the email exists in the database
    $stmt = $conn->prepare("SELECT id, full_name FROM users WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();
    $user = $result->fetch_assoc();

    if ($user) {
        // 2. Generate a unique token and set expiry (1 hour from now)
        $token = bin2hex(random_bytes(32));
        $expiry = date("Y-m-d H:i:s", strtotime('+1 hour'));

        // 3. Save the token to the password_resets table
        $stmt = $conn->prepare("INSERT INTO password_resets (email, token, expiry) VALUES (?, ?, ?)");
        $stmt->bind_param("sss", $email, $token, $expiry);
        $stmt->execute();

        // 4. Setup PHPMailer
        $mail = new PHPMailer(true);

        try {
            $mail->isSMTP();
            $mail->Host       = 'smtp.gmail.com';
            $mail->SMTPAuth   = true;
            
            // REPLACE WITH YOUR GMAIL AND APP PASSWORD
            $mail->Username   = 'homeservices.noreply@gmail.com'; 
            $mail->Password   = 'pxxhrjtostgmzfyi'; 
            
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            $mail->Port       = 587;

            // REPLACE WITH YOUR GMAIL
            $mail->setFrom('YOUR_GMAIL@gmail.com', 'HomeServices Booking Admin');
            $mail->addAddress($email, $user['full_name']);

            // Email Content
            $resetLink = "http://localhost/homeservicesbookingsystem/pages/reset-password.html?token=" . $token;
            
            $mail->isHTML(true);
            $mail->Subject = 'Password Reset Request';
            $mail->Body    = "
                <div style='font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;'>
                    <h2 style='color: #333;'>Reset Your Password</h2>
                    <p>Hi {$user['full_name']},</p>
                    <p>We received a request to reset your password for the HomeServices Online Booking System.</p>
                    <p>Click the button below to securely set a new password:</p>
                    <div style='text-align: center; margin: 30px 0;'>
                        <a href='{$resetLink}' style='background-color: #007bff; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;'>Reset Password</a>
                    </div>
                    <p style='color: #dc3545; font-size: 12px;'>Security Note: This link will expire in 1 hour. If you did not request a password reset, please ignore this email; your account remains secure.</p>
                </div>
            ";

            $mail->send();
            echo json_encode(['status' => 'success', 'message' => 'Reset link sent! Please check your email.']);
        } catch (Exception $e) {
            echo json_encode(['status' => 'error', 'message' => 'Failed to send email. Error: ' . $mail->ErrorInfo]);
        }
    } else {
        // Generic response for security purposes (prevents email enumeration)
        echo json_encode(['status' => 'error', 'message' => 'If this email is registered, you will receive a reset link.']);
    }
}
?>