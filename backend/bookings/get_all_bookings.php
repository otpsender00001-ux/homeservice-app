<?php

header('Content-Type: application/json');

require_once '../config/database.php';

$search = isset($_GET['search'])
    ? trim($_GET['search'])
    : '';

$status = isset($_GET['status'])
    ? trim($_GET['status'])
    : 'all';

/*
|--------------------------------------------------------------------------
| GET BOOKINGS
|--------------------------------------------------------------------------
| We keep the existing booking relationships:
| bookings -> users
| bookings -> services
| bookings -> technicians
|
| Additional booking information:
| - time_start
| - time_end
| - address
| - phone
| - notes
| - total_amount
| - labor_cost_amount
| - cancellation_reason
| - created_at
|
| Payment information is retrieved from the latest payment record.
|--------------------------------------------------------------------------
*/

$sql = "
    SELECT
        b.id,
        b.user_id,
        b.service_id,
        b.technician_id,

        u.full_name AS customer,

        s.service_name,
        s.category AS service_category,

        b.booking_date,
        b.time_start,
        b.time_end,

        b.address,
        b.phone,
        b.notes,

        t.full_name AS technician,

        b.status,
        b.cancellation_reason,

        b.total_amount,
        b.labor_cost_amount,

        p.amount AS payment_amount,
        p.payment_method,
        p.payment_status,
        p.transaction_ref,

        b.created_at

    FROM bookings b

    LEFT JOIN users u
        ON b.user_id = u.id

    LEFT JOIN services s
        ON b.service_id = s.id

    LEFT JOIN users t
        ON b.technician_id = t.id

    LEFT JOIN payments p
        ON p.id = (
            SELECT p2.id
            FROM payments p2
            WHERE p2.booking_id = b.id
            ORDER BY p2.created_at DESC, p2.id DESC
            LIMIT 1
        )

    WHERE 1 = 1
";

/*
|--------------------------------------------------------------------------
| SEARCH
|--------------------------------------------------------------------------
*/

$params = [];
$types = '';

if ($search !== '') {

    $sql .= "
        AND (
            u.full_name LIKE ?
            OR s.service_name LIKE ?
            OR b.phone LIKE ?
            OR b.address LIKE ?
        )
    ";

    $searchValue = '%' . $search . '%';

    $params[] = $searchValue;
    $params[] = $searchValue;
    $params[] = $searchValue;
    $params[] = $searchValue;

    $types .= 'ssss';
}

/*
|--------------------------------------------------------------------------
| STATUS FILTER
|--------------------------------------------------------------------------
*/

$allowedStatuses = [
    'pending',
    'accepted',
    'in_progress',
    'completed',
    'cancelled'
];

if (
    $status !== '' &&
    $status !== 'all' &&
    in_array($status, $allowedStatuses, true)
) {

    $sql .= "
        AND b.status = ?
    ";

    $params[] = $status;
    $types .= 's';
}

/*
|--------------------------------------------------------------------------
| ORDER
|--------------------------------------------------------------------------
*/

$sql .= "
    ORDER BY
        b.booking_date DESC,
        b.time_start DESC,
        b.id DESC
";

/*
|--------------------------------------------------------------------------
| PREPARED STATEMENT
|--------------------------------------------------------------------------
*/

$stmt = $conn->prepare($sql);

if (!$stmt) {

    echo json_encode([
        'success' => false,
        'message' => 'Failed to prepare booking query.',
        'data' => []
    ]);

    $conn->close();
    exit;
}

if (!empty($params)) {

    $stmt->bind_param(
        $types,
        ...$params
    );
}

$stmt->execute();

$res = $stmt->get_result();

$bookings = [];

if ($res) {

    while ($row = $res->fetch_assoc()) {

        $bookings[] = $row;
    }
}

$stmt->close();
$conn->close();

/*
|--------------------------------------------------------------------------
| RETURN ARRAY
|--------------------------------------------------------------------------
|
| IMPORTANT:
| Existing bookings.js expects an array.
| So we continue returning an array to avoid breaking the existing system.
|--------------------------------------------------------------------------
*/

echo json_encode(
    $bookings,
    JSON_UNESCAPED_UNICODE
);

?>