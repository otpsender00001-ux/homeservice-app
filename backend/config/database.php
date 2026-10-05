<?php

// Auto-detect: Local o Railway?
$isLocal = in_array($_SERVER['SERVER_NAME'] ?? '', ['localhost', '127.0.0.1']);

if ($isLocal) {
    // ===== LOCAL (XAMPP) =====
    $host = "127.0.0.1";
    $user = "root";
    $pass = "";
    $db   = "homeservice_db";
    $port = 3306;
} else {
    // ===== PRODUCTION (Railway) =====
    $host = getenv("MYSQLHOST")     ?: "mysql.railway.internal";
    $user = getenv("MYSQLUSER")     ?: "root";
    $pass = getenv("MYSQLPASSWORD") ?: "LMo5SxcN8hSEJ1Ygjy2W2WAyTDswraMBfK";
    $db   = getenv("MYSQLDATABASE") ?: "railway";
    $port = (int)(getenv("MYSQLPORT") ?: 3306);
}

// Enable error reporting for MySQLi
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    $conn = new mysqli($host, $user, $pass, $db, $port);
    $conn->set_charset("utf8mb4");
} catch (mysqli_sql_exception $e) {
    die("Database connection failed: " . $e->getMessage());
}
?>