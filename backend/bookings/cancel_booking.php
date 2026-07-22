<?php
session_start();
require_once '../config/database.php'; // Siguraduhin na tama ang path ng database connection mo

header('Content-Type: application/json');

// Check kung naka-login ang user
if (!isset($_SESSION['user_id'])) {
    echo json_encode(['error' => 'Unauthorized access. Please log in.']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $booking_id = isset($_POST['booking_id']) ? intval($_POST['booking_id']) : 0;
    $user_id = $_SESSION['user_id'];

    if ($booking_id === 0) {
        echo json_encode(['error' => 'Invalid booking ID.']);
        exit;
    }

    try {
        // I-update lang ang booking kung ang user na naka-login ang may-ari at pending o accepted pa lang
        $query = "UPDATE bookings SET status = 'cancelled' WHERE id = ? AND user_id = ? AND (status = 'pending' OR status = 'accepted')";
        
        // Gamit ang MySQLi
        if ($stmt = $conn->prepare($query)) {
            $stmt->bind_param("ii", $booking_id, $user_id);
            $stmt->execute();
            
            if ($stmt->affected_rows > 0) {
                echo json_encode(['success' => true]);
            } else {
                // Walang na-update. Posibleng in_progress na, or cancelled na, o hindi kanya ang booking
                echo json_encode(['error' => 'Booking could not be cancelled. It might already be processed.']);
            }
            $stmt->close();
        } else {
            echo json_encode(['error' => 'Database statement error.']);
        }
        
    } catch (Exception $e) {
        echo json_encode(['error' => 'An error occurred: ' . $e->getMessage()]);
    }
} else {
    echo json_encode(['error' => 'Invalid request method.']);
}
?>