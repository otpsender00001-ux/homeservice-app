<?php

if (getenv("MYSQLHOST")) {
    // Railway Deployment
    $host = getenv("MYSQLHOST");
    $user = getenv("MYSQLUSER");
    $pass = getenv("MYSQLPASSWORD");
    $db   = getenv("MYSQLDATABASE");
    $port = (int)getenv("MYSQLPORT"); // Cast port to integer

    $conn = new mysqli($host, $user, $pass, $db, $port);
} else {
    // Local Development (XAMPP)
    $host = "localhost";
    $user = "root";
    $pass = "";
    $db   = "homeservice_db";

    $conn = new mysqli($host, $user, $pass, $db);
}

if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

$conn->set_charset("utf8mb4");
?>