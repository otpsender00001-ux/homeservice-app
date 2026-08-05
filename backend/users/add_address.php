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

$label          = trim($_POST["label"] ?? "");
$recipient_name = trim($_POST["recipient_name"] ?? "");
$phone          = trim($_POST["phone"] ?? "");
$house_no       = trim($_POST["house_no"] ?? "");
$street         = trim($_POST["street"] ?? "");
$barangay       = trim($_POST["barangay"] ?? "");
$city           = trim($_POST["city"] ?? "");
$province       = trim($_POST["province"] ?? "");
$region         = trim($_POST["region"] ?? "");
$postal_code    = trim($_POST["postal_code"] ?? "");

$is_default = isset($_POST["is_default"]) ? 1 : 0;


/* =========================================
   IF FIRST ADDRESS -> MAKE DEFAULT
========================================= */

$check = $conn->prepare("
    SELECT COUNT(*) AS total
    FROM user_addresses
    WHERE user_id = ?
");

$check->bind_param("i", $user_id);
$check->execute();

$total = $check->get_result()->fetch_assoc()["total"];

if ($total == 0) {
    $is_default = 1;
}


/* =========================================
   ONLY ONE DEFAULT ADDRESS
========================================= */

if ($is_default == 1) {

    $reset = $conn->prepare("
        UPDATE user_addresses
        SET is_default = 0
        WHERE user_id = ?
    ");

    $reset->bind_param("i", $user_id);
    $reset->execute();

}


/* =========================================
   INSERT ADDRESS
========================================= */

$stmt = $conn->prepare("
INSERT INTO user_addresses
(
    user_id,
    label,
    recipient_name,
    phone,
    house_no,
    street,
    barangay,
    city,
    province,
    region,
    postal_code,
    is_default
)
VALUES
(
    ?,?,?,?,?,?,?,?,?,?,?,?
)
");

$stmt->bind_param(
    "issssssssssi",
    $user_id,
    $label,
    $recipient_name,
    $phone,
    $house_no,
    $street,
    $barangay,
    $city,
    $province,
    $region,
    $postal_code,
    $is_default
);

if ($stmt->execute()) {

    echo json_encode([
        "success" => true,
        "message" => "Address added successfully."
    ]);

} else {

    echo json_encode([
        "success" => false,
        "message" => $conn->error
    ]);

}