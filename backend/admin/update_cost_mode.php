<?php
ob_start(); // Pinipigilan ang anumang stray output na nakakasira sa JSON
session_start();
header('Content-Type: application/json');

error_reporting(0);
ini_set('display_errors', 0);

// 1. Admin Authentication Check
$isAdmin = false;
if (isset($_SESSION['role']) && strtolower($_SESSION['role']) === 'admin') {
    $isAdmin = true;
} elseif (isset($_SESSION['user_type']) && strtolower($_SESSION['user_type']) === 'admin') {
    $isAdmin = true;
} elseif (isset($_SESSION['admin_id']) || isset($_SESSION['user_id'])) {
    $isAdmin = true;
}

if (!$isAdmin) {
    ob_clean();
    echo json_encode([
        'success' => false,
        'message' => 'Unauthorized access. Please log in again.'
    ]);
    exit;
}

// 2. Kuhanin ang database connection mula sa backend/config/database.php
$db_path = __DIR__ . '/../config/database.php';

if (!file_exists($db_path)) {
    ob_clean();
    echo json_encode([
        'success' => false,
        'message' => 'Database file not found at backend/config/database.php'
    ]);
    exit;
}

require_once $db_path;

if (!isset($conn) || $conn->connect_error) {
    ob_clean();
    echo json_encode([
        'success' => false,
        'message' => 'Database connection failed: ' . ($conn ? $conn->connect_error : 'Connection variable $conn not found')
    ]);
    exit;
}

// 3. Basahin ang JSON payload mula sa JavaScript
$input = json_decode(file_get_contents('php://input'), true);

if (!$input || !isset($input['value'])) {
    ob_clean();
    echo json_encode([
        'success' => false,
        'message' => 'Invalid or missing daily rate value.'
    ]);
    exit;
}

$daily_rate = floatval($input['value']);

// 4. I-save o I-update ang daily_rate sa system_settings table
try {
    $stmt = $conn->prepare("INSERT INTO system_settings (setting_key, setting_value) VALUES ('daily_rate', ?) ON DUPLICATE KEY UPDATE setting_value = ?");
    
    if (!$stmt) {
        throw new Exception($conn->error);
    }

    $stmt->bind_param("dd", $daily_rate, $daily_rate);
    $stmt->execute();
    $stmt->close();

    ob_clean();
    echo json_encode([
        'success' => true,
        'message' => 'Daily salary rate updated successfully!'
    ]);

} catch (Exception $e) {
    ob_clean();
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
}