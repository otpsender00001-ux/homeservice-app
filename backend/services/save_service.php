<?php
header('Content-Type: application/json');
require_once '../config/database.php';

$id = $_POST['id'] ?? null;
// Gumamit ako ng real_escape_string para iwas error kung may ' o " sa text
$name = mysqli_real_escape_string($conn, $_POST['service_name']);
$desc = mysqli_real_escape_string($conn, $_POST['description']);
$price = mysqli_real_escape_string($conn, $_POST['price']);
$status = mysqli_real_escape_string($conn, $_POST['status']);

// --- ADDED: IMAGE UPLOAD LOGIC ---
$imageName = null;
if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
    // Relative path papunta sa uploads folder
    $uploadDir = '../../uploads/services/';
    
    // Create folder kung wala pa
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }

    // Lagyan ng oras yung pangalan para di mag-overwrite ang magkaparehong file name
    $imageName = time() . '_' . basename($_FILES["image"]["name"]);
    $targetFilePath = $uploadDir . $imageName;

    if (!move_uploaded_file($_FILES["image"]["tmp_name"], $targetFilePath)) {
        $imageName = null; // Reset kung nag fail ang upload
    }
}
// ---------------------------------

if ($id && $id !== 'null') {
    // UPDATE EXISTING
    if ($imageName) {
        // Kapag nag-upload ng bagong picture si admin
        $sql = "UPDATE services SET service_name='$name', description='$desc', price='$price', status='$status', image='$imageName' WHERE id='$id'";
    } else {
        // Kapag text lang inedit niya at WALANG bagong picture (ire-retain yung luma)
        $sql = "UPDATE services SET service_name='$name', description='$desc', price='$price', status='$status' WHERE id='$id'";
    }
} else {
    // INSERT NEW
    $imgVal = $imageName ? "'$imageName'" : "NULL";
    $sql = "INSERT INTO services (service_name, description, price, status, image) VALUES ('$name', '$desc', '$price', '$status', $imgVal)";
}

if ($conn->query($sql)) {
    echo json_encode(['success' => true]);
} else {
    echo json_encode(['success' => false, 'message' => $conn->error]);
}
?>