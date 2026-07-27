<?php

/* ==========================================
   NAKA-COMMENT: PANG-ONLINE / CLOUD DATABASE
=============================================
$host = getenv("MYSQLHOST");
$user = getenv("MYSQLUSER");
$pass = getenv("MYSQLPASSWORD");
$db   = getenv("MYSQLDATABASE");
$port = getenv("MYSQLPORT");

$conn = new mysqli($host, $user, $pass, $db, $port);
========================================== */


// ==========================================
// BAGONG CODES: PANG-LOCALHOST (XAMPP)
// ==========================================
$host = "localhost";
$user = "root";  // Default username sa XAMPP ay 'root'
$pass = "";      // Default password sa XAMPP ay blank o walang laman
$db   = "homeservice_db"; // Palitan mo ito ng eksaktong pangalan ng database mo sa phpMyAdmin

$conn = new mysqli($host, $user, $pass, $db);

// I-check kung may error sa connection
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

$conn->set_charset("utf8mb4");
?>