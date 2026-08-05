<?php
session_start();
header("Content-Type: application/json");

require_once "../config/database.php";

if(!isset($_SESSION["user_id"])){

    echo json_encode([
        "success"=>false,
        "message"=>"User not logged in."
    ]);
    exit;

}

$user_id = $_SESSION["user_id"];
$id = $_POST["id"] ?? 0;

if(empty($id)){

    echo json_encode([
        "success"=>false,
        "message"=>"Invalid address."
    ]);
    exit;

}

$stmt = $conn->prepare("
DELETE FROM user_addresses
WHERE id = ?
AND user_id = ?
");

$stmt->bind_param("ii", $id, $user_id);

if($stmt->execute()){

    echo json_encode([
        "success"=>true,
        "message"=>"Address deleted successfully."
    ]);

}else{

    echo json_encode([
        "success"=>false,
        "message"=>$conn->error
    ]);

}
?>