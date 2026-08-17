<?php

include '../config/database.php';

header('Content-Type: application/json; charset=utf-8');

if (!isset($_GET['action'])) {
    echo json_encode([
        "success" => false,
        "message" => "Missing action parameter"
    ]);
    exit;
}

$action = $_GET['action'];

if ($action === 'fetch') {

    $result = $conn->query(
        "SELECT id, time_start, time_end, max_capacity
         FROM time_slots
         ORDER BY time_start ASC"
    );

    if (!$result) {
        echo json_encode([
            "success" => false,
            "message" => $conn->error
        ]);
        exit;
    }

    $data = [];

    while ($row = $result->fetch_assoc()) {
        $data[] = $row;
    }

    echo json_encode($data);
    exit;
}

if ($action === 'delete') {

    if (!isset($_GET['id']) || !is_numeric($_GET['id'])) {
        echo json_encode([
            "success" => false,
            "message" => "Invalid slot ID"
        ]);
        exit;
    }

    $id = (int) $_GET['id'];

    $stmt = $conn->prepare(
        "DELETE FROM time_slots WHERE id = ?"
    );

    if (!$stmt) {
        echo json_encode([
            "success" => false,
            "message" => $conn->error
        ]);
        exit;
    }

    $stmt->bind_param("i", $id);
    $stmt->execute();

    echo json_encode([
        "status" => "deleted"
    ]);

    $stmt->close();
    exit;
}

echo json_encode([
    "success" => false,
    "message" => "Unknown action"
]);

exit;
?>