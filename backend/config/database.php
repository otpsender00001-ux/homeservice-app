<?php

// Fetch environment variables with fallbacks
$host = getenv("MYSQLHOST") ?: "mysql.railway.internal"; // Use '127.0.0.1' instead of 'localhost' to force TCP
$user = getenv("MYSQLUSER") ?: "root";
$pass = getenv("MYSQLPASSWORD") ?: "MRKHuwHytajhYrzTXuoBaddPRscjipBZ";
$db   = getenv("MYSQLDATABASE") ?: "railway";
$port = (int)(getenv("MYSQLPORT") ?: 3306);

// Enable error reporting for MySQLi
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    $conn = new mysqli($host, $user, $pass, $db, $port);
    $conn->set_charset("utf8mb4");
} catch (mysqli_sql_exception $e) {
    die("Database connection failed: " . $e->getMessage());
}
?>