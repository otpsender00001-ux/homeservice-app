<?php
session_start();
header("Content-Type: application/json");

require_once "../config/database.php";

if (!isset($_SESSION["user_id"])) {
    echo json_encode([
        "success" => false,
        "message" => "User not logged in."
    ]);
    exit;
}

$user_id = $_SESSION["user_id"];

$stmt = $conn->prepare("
    SELECT
        id,
        recipient_name,
        phone,
        street,
        barangay,
        city,
        province,
        region,
        postal_code,
        is_default
    FROM user_addresses
    WHERE user_id = ?
    ORDER BY
        is_default DESC,
        id DESC
");

$stmt->bind_param("i", $user_id);
$stmt->execute();

$result = $stmt->get_result();

$addresses = [];

while ($row = $result->fetch_assoc()) {
    $addresses[] = $row;
}

echo json_encode([
    "success" => true,
    "addresses" => $addresses
]);
?>