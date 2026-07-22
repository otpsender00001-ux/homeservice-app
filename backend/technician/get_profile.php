<?php
session_start();
require_once '../config/database.php';

header('Content-Type: application/json');

if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'technician') {
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized access.']);
    exit;
}

$user_id = $_SESSION['user_id'];

try {
    // ✅ IDINAGDAG: Isinama na ang bday, gender, at bio sa kukunin sa database
    $stmt = $conn->prepare("SELECT full_name, email, phone, address, profile_image, specialization, bday, gender, bio FROM users WHERE id = ?");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $user_data = $result->fetch_assoc();
    $stmt->close();

    if ($user_data) {
        // Kunin ang REAL RATINGS galing sa reviews table
        $rating_stmt = $conn->prepare("
            SELECT COALESCE(AVG(r.rating), 0) as avg_rating, COUNT(r.id) as review_count
            FROM reviews r
            JOIN bookings b ON r.booking_id = b.id
            WHERE b.technician_id = ?
        ");
        $rating_stmt->bind_param("i", $user_id);
        $rating_stmt->execute();
        $rating_result = $rating_stmt->get_result();
        $rating_data = $rating_result->fetch_assoc();
        $rating_stmt->close();

        // Pagsamahin ang data
        $user_data['avg_rating'] = number_format((float)$rating_data['avg_rating'], 1, '.', '');
        $user_data['review_count'] = $rating_data['review_count'];

        echo json_encode(['status' => 'success', 'data' => $user_data]);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Profile not found.']);
    }

} catch (Exception $e) {
    echo json_encode(['status' => 'error', 'message' => 'Database error: ' . $e->getMessage()]);
}
?>