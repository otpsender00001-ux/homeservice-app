<?php
include('../config/database.php');
session_start();

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(["error" => "Unauthorized access. Please login."]);
    exit;
}

$user_id = $_SESSION['user_id'];
$status_filter = $_GET['status'] ?? 'all';

try {

    /*
    |--------------------------------------------------------------------------
    | GET USER BOOKINGS
    |--------------------------------------------------------------------------
    | Existing booking information is preserved.
    | Additional information is included for the detailed user booking card.
    |
    | Latest payment is selected per booking to avoid duplicate booking cards
    | if a booking happens to have multiple payment records.
    |--------------------------------------------------------------------------
    */

    $query = "
        SELECT
            b.id,
            b.status,
            b.booking_date,
            b.time_start,
            b.time_end,
            b.time_start AS booking_time,

            b.address,
            b.phone,
            b.notes,

            b.total_amount,
            b.labor_cost_amount,
            b.created_at,

            s.service_name AS service,

            u.full_name AS tech_name,

            p.payment_method,
            p.payment_status,
            p.amount AS payment_amount,

            IF(r.id IS NOT NULL, 1, 0) AS is_rated,
            r.rating AS user_rating

        FROM bookings b

        LEFT JOIN services s
            ON b.service_id = s.id

        LEFT JOIN users u
            ON b.technician_id = u.id

        LEFT JOIN (
            SELECT p1.*
            FROM payments p1
            INNER JOIN (
                SELECT booking_id, MAX(id) AS max_id
                FROM payments
                GROUP BY booking_id
            ) p2
                ON p1.booking_id = p2.booking_id
                AND p1.id = p2.max_id
        ) p
            ON b.id = p.booking_id

        LEFT JOIN reviews r
            ON b.id = r.booking_id

        WHERE b.user_id = ?
    ";

    if ($status_filter !== 'all') {
        $query .= " AND b.status = ?";
    }

    $query .= " ORDER BY b.created_at DESC";

    $stmt = $conn->prepare($query);

    if (!$stmt) {
        throw new Exception("Failed to prepare booking query: " . $conn->error);
    }

    if ($status_filter !== 'all') {
        $stmt->bind_param("is", $user_id, $status_filter);
    } else {
        $stmt->bind_param("i", $user_id);
    }

    $stmt->execute();

    $result = $stmt->get_result();

    $bookings = [];

    while ($row = $result->fetch_assoc()) {

        /*
        |--------------------------------------------------------------------------
        | EXISTING DATA
        |--------------------------------------------------------------------------
        */

        $booking = [
            'id' => $row['id'],
            'status' => $row['status'],
            'booking_date' => $row['booking_date'],

            /*
             * Existing field retained
             */
            'booking_time' => $row['booking_time'],

            'service' => $row['service'],
            'tech_name' => $row['tech_name'],

            'is_rated' => (int)$row['is_rated'],
            'user_rating' => $row['user_rating'] !== null
                ? (int)$row['user_rating']
                : null,

            /*
            |--------------------------------------------------------------------------
            | NEW DETAILED BOOKING INFORMATION
            |--------------------------------------------------------------------------
            */

            'time_start' => $row['time_start'],
            'time_end' => $row['time_end'],

            'address' => $row['address'],
            'phone' => $row['phone'],
            'notes' => $row['notes'],

            'total_amount' => $row['total_amount'],
            'labor_cost_amount' => $row['labor_cost_amount'],

            'payment_method' => $row['payment_method'],
            'payment_status' => $row['payment_status'],
            'payment_amount' => $row['payment_amount'],

            'created_at' => $row['created_at']
        ];

        $bookings[] = $booking;
    }

    echo json_encode($bookings);

} catch (Exception $e) {

    http_response_code(500);

    echo json_encode([
        "error" => $e->getMessage()
    ]);
}
?>