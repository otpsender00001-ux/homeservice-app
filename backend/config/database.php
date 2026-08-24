<?php

if (getenv("MYSQLHOST")) {
    // Railway
    $host = getenv("MYSQLHOST");
    $user = getenv("MYSQLUSER");
    $pass = getenv("MYSQLPASSWORD");
    $db   = getenv("MYSQLDATABASE");
    $port = getenv("MYSQLPORT");

    $conn = new mysqli($host, $user, $pass, $db, $port);

} else {
    // XAMPP
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