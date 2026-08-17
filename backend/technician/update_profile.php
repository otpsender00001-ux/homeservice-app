<?php

session_start();

require_once '../config/database.php';

header('Content-Type: application/json');

// ==========================================
// AUTHENTICATION CHECK
// ==========================================

if (!isset($_SESSION['user_id'])) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Unauthorized access. User session not found.'
    ]);
    exit;
}

if (!isset($_SESSION['role']) || $_SESSION['role'] !== 'technician') {
    echo json_encode([
        'status' => 'error',
        'message' => 'Unauthorized access. Technician session required.'
    ]);
    exit;
}

$user_id = (int) $_SESSION['user_id'];

// ==========================================
// GET FORM DATA
// ==========================================

$full_name = trim($_POST['full_name'] ?? '');
$phone = trim($_POST['phone'] ?? '');
$address = trim($_POST['address'] ?? '');
$specialization = trim($_POST['specialization'] ?? '');
$bday = trim($_POST['bday'] ?? '');
$gender = trim($_POST['gender'] ?? '');
$bio = trim($_POST['bio'] ?? '');

// Convert empty birthday to NULL
if ($bday === '') {
    $bday = null;
}

// ==========================================
// BASIC VALIDATION
// ==========================================

if ($full_name === '') {
    echo json_encode([
        'status' => 'error',
        'message' => 'Full name is required.'
    ]);
    exit;
}

// ==========================================
// PROFILE IMAGE UPLOAD
// ==========================================

$profile_image = null;

if (
    isset($_FILES['profile_image']) &&
    $_FILES['profile_image']['error'] === UPLOAD_ERR_OK
) {

    $target_dir = "../../uploads/profiles/";

    if (!is_dir($target_dir)) {
        mkdir($target_dir, 0777, true);
    }

    $file_extension = strtolower(
        pathinfo($_FILES['profile_image']['name'], PATHINFO_EXTENSION)
    );

    $allowed_ext = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

    if (!in_array($file_extension, $allowed_ext, true)) {
        echo json_encode([
            'status' => 'error',
            'message' => 'Invalid profile image format.'
        ]);
        exit;
    }

    // Optional size protection: 5MB maximum
    if ($_FILES['profile_image']['size'] > 5 * 1024 * 1024) {
        echo json_encode([
            'status' => 'error',
            'message' => 'Profile image must not exceed 5MB.'
        ]);
        exit;
    }

    $new_filename =
        "tech_" .
        $user_id .
        "_" .
        time() .
        "." .
        $file_extension;

    $target_file = $target_dir . $new_filename;

    if (
        !move_uploaded_file(
            $_FILES['profile_image']['tmp_name'],
            $target_file
        )
    ) {
        echo json_encode([
            'status' => 'error',
            'message' => 'Failed to upload profile image.'
        ]);
        exit;
    }

    $profile_image = $new_filename;
}

// ==========================================
// UPDATE DATABASE
// ==========================================

try {

    if ($profile_image !== null) {

        $stmt = $conn->prepare("
            UPDATE users
            SET
                full_name = ?,
                phone = ?,
                address = ?,
                specialization = ?,
                bday = ?,
                gender = ?,
                bio = ?,
                profile_image = ?
            WHERE id = ?
              AND role = 'technician'
        ");

        if (!$stmt) {
            throw new Exception($conn->error);
        }

        $stmt->bind_param(
            "ssssssssi",
            $full_name,
            $phone,
            $address,
            $specialization,
            $bday,
            $gender,
            $bio,
            $profile_image,
            $user_id
        );

    } else {

        $stmt = $conn->prepare("
            UPDATE users
            SET
                full_name = ?,
                phone = ?,
                address = ?,
                specialization = ?,
                bday = ?,
                gender = ?,
                bio = ?
            WHERE id = ?
              AND role = 'technician'
        ");

        if (!$stmt) {
            throw new Exception($conn->error);
        }

        $stmt->bind_param(
            "sssssssi",
            $full_name,
            $phone,
            $address,
            $specialization,
            $bday,
            $gender,
            $bio,
            $user_id
        );
    }

    if (!$stmt->execute()) {
        throw new Exception($stmt->error);
    }

    // ==========================================
    // CHECK IF USER WAS ACTUALLY UPDATED
    // ==========================================

    if ($stmt->affected_rows >= 0) {

        echo json_encode([
            'status' => 'success',
            'message' => 'Profile updated successfully!'
        ]);

    } else {

        echo json_encode([
            'status' => 'error',
            'message' => 'No profile changes were saved.'
        ]);
    }

    $stmt->close();

} catch (Exception $e) {

    http_response_code(500);

    echo json_encode([
        'status' => 'error',
        'message' => 'Database error: ' . $e->getMessage()
    ]);
}

$conn->close();

?>