<?php
session_start();
include("../config/database.php");

if($_SERVER["REQUEST_METHOD"] == "POST"){

    $email = $_POST['email'];
    $password = $_POST['password'];

    // 🛡️ PROFESSIONAL UPDATE: Ginamit natin ang Prepared Statements
    $stmt = $conn->prepare("SELECT id, password, role FROM users WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();

    if($result->num_rows == 0){
        header("Location: ../../pages/login.html?error=user_not_found");
        exit;
    }

    $user = $result->fetch_assoc();

    if(!password_verify($password, $user['password'])){
        header("Location: ../../pages/login.html?error=wrong_password");
        exit;
    }

    // ✅ DITO NANGGAGALING ANG DYNAMIC ID
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['role'] = $user['role'];

    // ⏳ Delay so the loading animation can play
    sleep(2);

    // Redirect based on role
    if($user['role'] == 'admin'){
        header("Location: ../../pages/admin-dashboard.html");
    }elseif($user['role'] == 'technician'){
        header("Location: ../../pages/tech-dashboard.html");
    }else{
        header("Location: ../../pages/user-dashboard.html");
    }

    exit; // Laging mag-exit pagkatapos ng header redirect
}
?>