<?php
include '../config/database.php';

// ACTION: FETCH ALL SLOTS
if ($_GET['action'] == 'fetch') {
    $result = $conn->query("SELECT * FROM time_slots ORDER BY time_start ASC");
    $data = [];
    while($row = $result->fetch_assoc()) {
        $data[] = $row;
    }
    echo json_encode($data);
}

// ACTION: DELETE SLOT
if ($_GET['action'] == 'delete') {
    $id = $_GET['id'];
    $conn->query("DELETE FROM time_slots WHERE id = $id");
    echo json_encode(["status" => "deleted"]);
}
?>