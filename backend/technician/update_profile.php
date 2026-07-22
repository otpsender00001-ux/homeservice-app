<?php
session_start();
require_once '../config/database.php';

header('Content-Type: application/json');

if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'technician') {
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized access.']);
    exit;
}

$user_id = $_SESSION['user_id'];
$full_name = $_POST['full_name'] ?? '';
$phone = $_POST['phone'] ?? '';
$address = $_POST['address'] ?? '';
$specialization = $_POST['specialization'] ?? '';

// ✅ IDINAGDAG: Kukunin na natin ang Bday, Gender, at Bio mula sa HTML form
// Ginawang NULL ang bday kung empty para hindi mag-error sa Strict Mode ng MySQL
$bday = (isset($_POST['bday']) && trim($_POST['bday']) !== '') ? trim($_POST['bday']) : null;
$gender = $_POST['gender'] ?? '';
$bio = $_POST['bio'] ?? '';

// Image Upload Logic
$profile_image = null;
if (isset($_FILES['profile_image']) && $_FILES['profile_image']['error'] === UPLOAD_ERR_OK) {
    $target_dir = "../../uploads/profiles/";
    
    if (!is_dir($target_dir)) {
        mkdir($target_dir, 0777, true);
    }

    $file_extension = strtolower(pathinfo($_FILES["profile_image"]["name"], PATHINFO_EXTENSION));
    $allowed_ext = ['jpg', 'jpeg', 'png', 'gif'];
    
    if (in_array($file_extension, $allowed_ext)) {
        $new_filename = "tech_" . $user_id . "_" . time() . "." . $file_extension;
        $target_file = $target_dir . $new_filename;

        if (move_uploaded_file($_FILES["profile_image"]["tmp_name"], $target_file)) {
            $profile_image = $new_filename;
        }
    }
}

try {
    // ✅ IDINAGDAG: Isinama na sa UPDATE query at bind_param ang bday, gender, at bio
    if ($profile_image) {
        $stmt = $conn->prepare("UPDATE users SET full_name = ?, phone = ?, address = ?, specialization = ?, bday = ?, gender = ?, bio = ?, profile_image = ? WHERE id = ?");
        $stmt->bind_param("ssssssssi", $full_name, $phone, $address, $specialization, $bday, $gender, $bio, $profile_image, $user_id);
    } else {
        $stmt = $conn->prepare("UPDATE users SET full_name = ?, phone = ?, address = ?, specialization = ?, bday = ?, gender = ?, bio = ? WHERE id = ?");
        $stmt->bind_param("sssssssi", $full_name, $phone, $address, $specialization, $bday, $gender, $bio, $user_id);
    }

    if ($stmt->execute()) {
        echo json_encode(['status' => 'success', 'message' => 'Profile updated successfully!']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Failed to update profile.']);
    }

    $stmt->close();
} catch (Exception $e) {
    echo json_encode(['status' => 'error', 'message' => 'Database error: ' . $e->getMessage()]);
}
?>