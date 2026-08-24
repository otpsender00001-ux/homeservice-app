<?php

include('../config/database.php');
session_start();

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode([]);
    exit;
}

$admin_id = $_SESSION['user_id'];

try {

    $query = "
        SELECT 
            u.id,
            u.full_name,
            u.role,
            MAX(m.created_at) AS last_active,

            SUM(
                CASE
                    WHEN m.receiver_id = ?
                    AND m.is_read = 0
                    AND m.booking_id IS NULL
                    THEN 1
                    ELSE 0
                END
            ) AS unread_count

        FROM messages m

        JOIN users u
            ON (u.id = m.sender_id OR u.id = m.receiver_id)

        WHERE 
            (m.sender_id = ? OR m.receiver_id = ?)
            AND u.id != ?
            AND m.booking_id IS NULL

        GROUP BY
            u.id,
            u.full_name,
            u.role

        ORDER BY last_active DESC
    ";

    $stmt = $conn->prepare($query);

    $stmt->bind_param(
        "iiii",
        $admin_id,
        $admin_id,
        $admin_id,
        $admin_id
    );

    $stmt->execute();

    $res = $stmt->get_result();

    $contacts = [];

    while ($row = $res->fetch_assoc()) {

        $row['unread_count'] = (int)$row['unread_count'];

        $contacts[] = $row;
    }

    echo json_encode($contacts);

} catch (Exception $e) {

    echo json_encode([
        "error" => $e->getMessage()
    ]);
}
?>