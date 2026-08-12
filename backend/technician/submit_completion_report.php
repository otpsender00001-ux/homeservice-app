<?php

session_start();

header('Content-Type: application/json');

require_once '../config/database.php';

try {

    /* =====================================================
       CHECK TECHNICIAN SESSION
    ===================================================== */

    if (!isset($_SESSION['user_id'])) {

        echo json_encode([
            'success' => false,
            'message' => 'Session expired. Please login again.'
        ]);

        exit;
    }

    $technician_id = intval($_SESSION['user_id']);


    /* =====================================================
       GET FORM DATA
    ===================================================== */

    $booking_id = isset($_POST['booking_id'])
        ? intval($_POST['booking_id'])
        : 0;

    $problem_found = trim($_POST['problem_found'] ?? '');

    $work_done = trim($_POST['work_done'] ?? '');

    $electrical_components =
        trim($_POST['electrical_components'] ?? '');

    $mechanical_components =
        trim($_POST['mechanical_components'] ?? '');

    $replaced_parts =
        trim($_POST['replaced_parts'] ?? '');

    $replacement_cost =
        isset($_POST['replacement_cost'])
        ? floatval($_POST['replacement_cost'])
        : 0;


    /* =====================================================
       VALIDATION
    ===================================================== */

    if ($booking_id <= 0) {

        echo json_encode([
            'success' => false,
            'message' => 'Booking ID is missing.'
        ]);

        exit;
    }


    if ($problem_found === '') {

        echo json_encode([
            'success' => false,
            'message' => 'Problem found is required.'
        ]);

        exit;
    }


    if ($work_done === '') {

        echo json_encode([
            'success' => false,
            'message' => 'Work done is required.'
        ]);

        exit;
    }


    if ($replacement_cost < 0) {
        $replacement_cost = 0;
    }


    /* =====================================================
       CHECK BOOKING
    ===================================================== */

    $checkBooking = $conn->prepare("
        SELECT id, technician_id, status
        FROM bookings
        WHERE id = ?
        LIMIT 1
    ");

    if (!$checkBooking) {
        throw new Exception(
            'Failed to prepare booking query: ' .
            $conn->error
        );
    }

    $checkBooking->bind_param(
        "i",
        $booking_id
    );

    $checkBooking->execute();

    $bookingResult = $checkBooking->get_result();

    $booking = $bookingResult->fetch_assoc();

    $checkBooking->close();


    if (!$booking) {

        echo json_encode([
            'success' => false,
            'message' => 'Booking not found.'
        ]);

        exit;
    }


    /* =====================================================
       MAKE SURE THIS JOB BELONGS TO THIS TECHNICIAN
    ===================================================== */

    if (
        isset($booking['technician_id']) &&
        intval($booking['technician_id']) !== $technician_id
    ) {

        echo json_encode([
            'success' => false,
            'message' => 'You are not assigned to this booking.'
        ]);

        exit;
    }


    /* =====================================================
       CHECK IF REPORT ALREADY EXISTS
    ===================================================== */

    $checkReport = $conn->prepare("
        SELECT id
        FROM job_completion_reports
        WHERE booking_id = ?
        LIMIT 1
    ");

    if (!$checkReport) {
        throw new Exception(
            'Failed to prepare completion report query: ' .
            $conn->error
        );
    }

    $checkReport->bind_param(
        "i",
        $booking_id
    );

    $checkReport->execute();

    $reportResult = $checkReport->get_result();

    $existingReport = $reportResult->fetch_assoc();

    $checkReport->close();


    if ($existingReport) {

        echo json_encode([
            'success' => false,
            'message' => 'A completion report already exists for this booking.'
        ]);

        exit;
    }


    /* =====================================================
       HANDLE REPAIR PHOTO
    ===================================================== */

    $repair_photo = null;

    if (
        isset($_FILES['repair_photo']) &&
        $_FILES['repair_photo']['error'] !== UPLOAD_ERR_NO_FILE
    ) {

        /* ---------------------------------------------
           CHECK UPLOAD ERROR
        --------------------------------------------- */

        if (
            $_FILES['repair_photo']['error'] !==
            UPLOAD_ERR_OK
        ) {

            echo json_encode([
                'success' => false,
                'message' => 'There was an error uploading the repair photo.'
            ]);

            exit;
        }


        /* ---------------------------------------------
           MAX 5MB
        --------------------------------------------- */

        if (
            $_FILES['repair_photo']['size'] >
            5 * 1024 * 1024
        ) {

            echo json_encode([
                'success' => false,
                'message' => 'Repair photo must be smaller than 5MB.'
            ]);

            exit;
        }


        /* ---------------------------------------------
           CHECK MIME TYPE
        --------------------------------------------- */

        $allowed_types = [
            'image/jpeg',
            'image/png',
            'image/webp'
        ];

        $file_type = mime_content_type(
            $_FILES['repair_photo']['tmp_name']
        );


        if (!in_array($file_type, $allowed_types)) {

            echo json_encode([
                'success' => false,
                'message' => 'Invalid photo type. JPG, PNG, or WEBP only.'
            ]);

            exit;
        }


        /* ---------------------------------------------
           DETERMINE EXTENSION
        --------------------------------------------- */

        switch ($file_type) {

            case 'image/jpeg':
                $extension = 'jpg';
                break;

            case 'image/png':
                $extension = 'png';
                break;

            case 'image/webp':
                $extension = 'webp';
                break;

            default:
                $extension = 'jpg';
        }


        /* ---------------------------------------------
           UPLOAD DIRECTORY
        --------------------------------------------- */

        $upload_dir = '../../uploads/completion/';


        if (!is_dir($upload_dir)) {

            if (!mkdir($upload_dir, 0777, true)) {

                echo json_encode([
                    'success' => false,
                    'message' => 'Failed to create completion upload directory.'
                ]);

                exit;
            }
        }


        /* ---------------------------------------------
           SAFE FILE NAME
        --------------------------------------------- */

        $file_name =
            'completion_' .
            $booking_id .
            '_' .
            time() .
            '_' .
            bin2hex(random_bytes(4)) .
            '.' .
            $extension;


        $target_path =
            $upload_dir . $file_name;


        /* ---------------------------------------------
           MOVE UPLOADED FILE
        --------------------------------------------- */

        if (
            !move_uploaded_file(
                $_FILES['repair_photo']['tmp_name'],
                $target_path
            )
        ) {

            echo json_encode([
                'success' => false,
                'message' => 'Failed to save the repair photo.'
            ]);

            exit;
        }


        $repair_photo = $file_name;
    }


    /* =====================================================
       START DATABASE TRANSACTION
    ===================================================== */

    $conn->begin_transaction();


    /* =====================================================
       INSERT COMPLETION REPORT
    ===================================================== */

    $stmt = $conn->prepare("
        INSERT INTO job_completion_reports (
            booking_id,
            technician_id,
            problem_found,
            work_done,
            electrical_components,
            mechanical_components,
            replaced_parts,
            replacement_cost,
            repair_photo
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");


    if (!$stmt) {

        throw new Exception(
            'Failed to prepare completion report insert: ' .
            $conn->error
        );
    }


    $stmt->bind_param(
        "iissssdss",
        $booking_id,
        $technician_id,
        $problem_found,
        $work_done,
        $electrical_components,
        $mechanical_components,
        $replaced_parts,
        $replacement_cost,
        $repair_photo
    );


    if (!$stmt->execute()) {

        throw new Exception(
            'Failed to insert completion report: ' .
            $stmt->error
        );
    }


    $report_id = $conn->insert_id;

    $stmt->close();


    /* =====================================================
       UPDATE BOOKING STATUS
    ===================================================== */

    $updateBooking = $conn->prepare("
        UPDATE bookings
        SET status = 'completed'
        WHERE id = ?
    ");


    if (!$updateBooking) {

        throw new Exception(
            'Failed to prepare booking update: ' .
            $conn->error
        );
    }


    $updateBooking->bind_param(
        "i",
        $booking_id
    );


    if (!$updateBooking->execute()) {

        throw new Exception(
            'Failed to update booking status: ' .
            $updateBooking->error
        );
    }


    $updateBooking->close();


    /* =====================================================
       COMMIT
    ===================================================== */

    $conn->commit();


    /* =====================================================
       SUCCESS
    ===================================================== */

    echo json_encode([

        'success' => true,

        'message' =>
            'Job completion report submitted successfully.',

        'report_id' =>
            $report_id,

        'repair_photo' =>
            $repair_photo
    ]);


} catch (Exception $e) {

    /* =====================================================
       ROLLBACK
    ===================================================== */

    if (
        isset($conn) &&
        $conn instanceof mysqli &&
        $conn->errno === 0
    ) {
        // Nothing needed here
    }

    if (
        isset($conn) &&
        $conn instanceof mysqli
    ) {
        try {
            $conn->rollback();
        } catch (Exception $rollbackError) {
            // Ignore rollback error
        }
    }


    /* =====================================================
       LOG REAL ERROR
    ===================================================== */

    error_log(
        'Completion Report Error: ' .
        $e->getMessage()
    );


    /* =====================================================
       RETURN ERROR TO JAVASCRIPT
    ===================================================== */

    echo json_encode([

        'success' => false,

        'message' =>
            'Something went wrong while submitting the completion report.',

        'debug' =>
            $e->getMessage()
    ]);
}

?>