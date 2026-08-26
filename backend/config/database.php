<?php

if (getenv("DB_HOST")) {

    // Railway Deployment
    $host = getenv("DB_HOST");
    $user = getenv("DB_USERNAME");
    $pass = getenv("DB_PASSWORD");
    $db   = getenv("DB_DATABASE");
    $port = (int)getenv("DB_PORT");

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