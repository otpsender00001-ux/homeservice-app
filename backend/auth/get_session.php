<?php
session_start();
header('Content-Type: application/json');

// Ibalik ang user_id na naka-store sa session nung nag-login siya
if (isset($_SESSION['user_id'])) {
    echo json_encode(['user_id' => $_SESSION['user_id']]);
} else {
    echo json_encode(['user_id' => null]);
}
?>