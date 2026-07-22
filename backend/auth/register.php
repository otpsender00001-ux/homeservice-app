<?php
include("../config/database.php");

if($_SERVER["REQUEST_METHOD"] == "POST"){

    $name = $_POST['full_name'];
    $email = $_POST['email'];
    $password = $_POST['password'];
    $confirm = $_POST['confirm_password'];

    if($password !== $confirm){
        header("Location: ../../pages/register.html?error=password_mismatch");
        exit;
    }

    $check = $conn->query("SELECT * FROM users WHERE email='$email'");
    if($check->num_rows > 0){
        header("Location: ../../pages/register.html?error=email_exists");
        exit;
    }

    $hashed = password_hash($password, PASSWORD_DEFAULT);

    $sql = "INSERT INTO users (full_name, email, password) 
            VALUES ('$name', '$email', '$hashed')";

    if($conn->query($sql)){
        header("Location: ../../pages/login.html?success=registered");
    } else {
        echo "Error: " . $conn->error;
    }
}
?>