<?php
session_start();
header('Content-Type: application/json');

require_once '../config/database.php';

if (!isset($_SESSION['user_id'])) {

    echo json_encode([
        "success" => false,
        "message" => "Not logged in."
    ]);

    exit;
}

$user_id = $_SESSION['user_id'];

$full_name = trim($_POST['full_name'] ?? '');
$phone     = trim($_POST['phone'] ?? '');
$address   = trim($_POST['address'] ?? '');
$gender    = trim($_POST['gender'] ?? '');
$bday      = trim($_POST['bday'] ?? '');
$bio       = trim($_POST['bio'] ?? '');


// =============================
// PROFILE VALIDATION
// =============================

// Full name
if ($full_name === '') {

    echo json_encode([
        "success" => false,
        "message" => "Full name is required."
    ]);

    exit;
}


// Letters and spaces only
if (!preg_match("/^[a-zA-Z\s]+$/", $full_name)) {

    echo json_encode([
        "success" => false,
        "message" => "Full name must contain letters and spaces only."
    ]);

    exit;
}


// Phone
if ($phone === '') {

    echo json_encode([
        "success" => false,
        "message" => "Phone number is required."
    ]);

    exit;
}


// Exactly 11 digits and starts with 09
if (!preg_match("/^09[0-9]{9}$/", $phone)) {

    echo json_encode([
        "success" => false,
        "message" => "Phone number must start with 09 and contain exactly 11 digits."
    ]);

    exit;
}

// =============================
// PROFILE IMAGE UPLOAD
// =============================

$imageName = null;

if (
    isset($_FILES['profile_image']) &&
    $_FILES['profile_image']['error'] === 0
) {

    $uploadDir = "../../uploads/profiles/";

    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }

    $extension = strtolower(pathinfo(
        $_FILES['profile_image']['name'],
        PATHINFO_EXTENSION
    ));

    $allowed = ['jpg','jpeg','png','gif','webp'];

    if (in_array($extension, $allowed)) {

        $imageName = "user_" .
                     $user_id .
                     "_" .
                     time() .
                     "." .
                     $extension;

        move_uploaded_file(
            $_FILES['profile_image']['tmp_name'],
            $uploadDir . $imageName
        );

    }

}


// =============================
// UPDATE QUERY
// =============================

if ($imageName) {

    $stmt = $conn->prepare("
        UPDATE users
        SET
            full_name=?,
            phone=?,
            address=?,
            gender=?,
            bday=?,
            bio=?,
            profile_image=?
        WHERE id=?
    ");

    $stmt->bind_param(
        "sssssssi",
        $full_name,
        $phone,
        $address,
        $gender,
        $bday,
        $bio,
        $imageName,
        $user_id
    );

} else {

    $stmt = $conn->prepare("
        UPDATE users
        SET
            full_name=?,
            phone=?,
            address=?,
            gender=?,
            bday=?,
            bio=?
        WHERE id=?
    ");

    $stmt->bind_param(
        "ssssssi",
        $full_name,
        $phone,
        $address,
        $gender,
        $bday,
        $bio,
        $user_id
    );

}

if ($stmt->execute()) {

    echo json_encode([
        "success" => true,
        "message" => "Profile updated successfully."
    ]);

} else {

    echo json_encode([
        "success" => false,
        "message" => $stmt->error
    ]);

}

$stmt->close();
$conn->close();
?>