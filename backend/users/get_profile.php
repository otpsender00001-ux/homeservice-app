<?php
session_start();
header('Content-Type: application/json');

require_once '../config/database.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode([
        "status" => "error",
        "message" => "Not logged in"
    ]);
    exit;
}

$user_id = $_SESSION['user_id'];

$stmt = $conn->prepare("
    SELECT
        full_name,
        email,
        phone,
        address,
        gender,
        bday,
        bio,
        profile_image
    FROM users
    WHERE id = ?
");

$stmt->bind_param("i", $user_id);
$stmt->execute();

$result = $stmt->get_result();

if ($row = $result->fetch_assoc()) {

    echo json_encode([
        "status" => "success",
        "data" => $row
    ]);

} else {

    echo json_encode([
        "status" => "error",
        "message" => "User not found"
    ]);

}
?>