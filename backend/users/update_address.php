<?php
session_start();
header("Content-Type: application/json");

require_once "../config/database.php";

if(!isset($_SESSION["user_id"])){
    echo json_encode([
        "success" => false,
        "message" => "User not logged in."
    ]);
    exit;
}

$user_id = $_SESSION["user_id"];

$id             = $_POST["id"] ?? 0;
$recipient_name = trim($_POST["recipient_name"] ?? "");
$phone          = trim($_POST["phone"] ?? "");
$address        = trim($_POST["address"] ?? "");
$barangay       = trim($_POST["barangay"] ?? "");
$city           = trim($_POST["city"] ?? "");
$province       = trim($_POST["province"] ?? "");
$region         = trim($_POST["region"] ?? "");
$postal_code    = trim($_POST["postal_code"] ?? "");

if(
    empty($id) ||
    empty($recipient_name) ||
    empty($phone) ||
    empty($address) ||
    empty($barangay) ||
    empty($city) ||
    empty($province)
){
    echo json_encode([
        "success" => false,
        "message" => "Please complete all required fields."
    ]);
    exit;
}

$stmt = $conn->prepare("
UPDATE user_addresses
SET
    recipient_name=?,
    phone=?,
    street=?,
    barangay=?,
    city=?,
    province=?,
    region=?,
    postal_code=?
WHERE
    id=?
AND
    user_id=?
");

$stmt->bind_param(
    "ssssssssii",
    $recipient_name,
    $phone,
    $address,
    $barangay,
    $city,
    $province,
    $region,
    $postal_code,
    $id,
    $user_id
);

if($stmt->execute()){

    echo json_encode([
        "success"=>true,
        "message"=>"Address updated successfully."
    ]);

}else{

    echo json_encode([
        "success"=>false,
        "message"=>$conn->error
    ]);

}
?>