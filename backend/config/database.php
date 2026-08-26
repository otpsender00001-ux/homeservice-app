<?php

$host = getenv("DB_HOST");
$user = getenv("DB_USERNAME");
$pass = getenv("DB_PASSWORD");
$db   = getenv("DB_DATABASE");
$port = (int)getenv("DB_PORT");

$conn = new mysqli($host, $user, $pass, $db, $port);

if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

$conn->set_charset("utf8mb4");

?>