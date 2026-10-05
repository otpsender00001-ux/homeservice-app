
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
        SELECT id, technician_id, status, total_amount
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
       VALIDATE BOOKING AMOUNT

       A completed service must have a valid sale amount.
       This prevents an accounting record with labor cost but
       no actual revenue amount.
    ===================================================== */

    $booking_amount = floatval(
        $booking['total_amount'] ?? 0
    );

    if ($booking_amount <= 0) {

        echo json_encode([
            'success' => false,
            'message' => 'This booking has no valid service amount and cannot be completed.'
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
       GET CURRENT EFFECTIVE DAILY RATE
       
       IMPORTANT:
       The rate used here is the rate that is ACTIVE
       for the current day.

       A newly scheduled rate for tomorrow will NOT
       affect today's completed job.
    ===================================================== */

    $daily_rate = 800;

    $settings = [];

    $settingsResult = $conn->query("
        SELECT setting_key, setting_value
        FROM system_settings
        WHERE setting_key IN (
            'cost_mode',
            'daily_rate',
            'pending_daily_rate',
            'daily_rate_effective_date'
        )
    ");

    if ($settingsResult) {

        while ($settingRow = $settingsResult->fetch_assoc()) {

            $settings[
                $settingRow['setting_key']
            ] = $settingRow['setting_value'];
        }
    }


    /* =====================================================
       CHECK IF A PENDING RATE IS NOW EFFECTIVE
       
       Example:
       Aug 16 -> current rate ₱800
       pending rate -> ₱1000
       effective date -> Aug 17

       On Aug 16:
       ₱800 remains active.

       On Aug 17:
       ₱1000 becomes active.
    ===================================================== */

    $currentDate = date('Y-m-d');

    $pendingRate =
        isset($settings['pending_daily_rate'])
        ? floatval($settings['pending_daily_rate'])
        : 0;

    $effectiveDate =
        $settings['daily_rate_effective_date'] ?? '';


    if (
        $pendingRate > 0 &&
        $effectiveDate !== '' &&
        $effectiveDate <= $currentDate
    ) {

        /* ---------------------------------------------
           ACTIVATE PENDING RATE
        --------------------------------------------- */

        $activateRate = $conn->prepare("
            UPDATE system_settings
            SET setting_value = ?
            WHERE setting_key = 'daily_rate'
        ");

        if ($activateRate) {

            $activateRate->bind_param(
                "s",
                $pendingRate
            );

            $activateRate->execute();

            $activateRate->close();
        }


        /* ---------------------------------------------
           REMOVE PENDING RATE
        --------------------------------------------- */

        $clearPendingRate = $conn->prepare("
            DELETE FROM system_settings
            WHERE setting_key IN (
                'pending_daily_rate',
                'daily_rate_effective_date'
            )
        ");

        if ($clearPendingRate) {

            $clearPendingRate->execute();

            $clearPendingRate->close();
        }


        $daily_rate = $pendingRate;

    } else {

        /* ---------------------------------------------
           USE CURRENT ACTIVE RATE
        --------------------------------------------- */

        $daily_rate =
            isset($settings['daily_rate'])
            ? floatval($settings['daily_rate'])
            : 800;
    }


    /* =====================================================
       ENSURE VALID DAILY RATE
    ===================================================== */

    if ($daily_rate <= 0) {
        $daily_rate = 800;
    }


    /* =====================================================
       LOCK TECHNICIAN LABOR COST FOR THIS JOB
       
       THIS IS THE IMPORTANT PART.

       Once this job is completed:
       
       labor_cost_amount = today's active daily rate

       Therefore:
       
       Aug 16 completed = ₱800

       Even if admin changes tomorrow to ₱1000,
       this booking remains ₱800.
    ===================================================== */

    $labor_cost_amount = $daily_rate;


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
       
       ALSO LOCK THE DAILY LABOR COST HERE.
    ===================================================== */

    $updateBooking = $conn->prepare("
        UPDATE bookings
        SET
            status = 'completed',
            labor_cost_amount = ?
        WHERE id = ?
    ");


    if (!$updateBooking) {

        throw new Exception(
            'Failed to prepare booking update: ' .
            $conn->error
        );
    }


    $updateBooking->bind_param(
        "di",
        $labor_cost_amount,
        $booking_id
    );


    if (!$updateBooking->execute()) {

        throw new Exception(
            'Failed to update booking status and labor cost: ' .
            $updateBooking->error
        );
    }


    $updateBooking->close();


    /* =====================================================
       ENSURE COMPLETED BOOKING HAS ONE VALID PAID REVENUE RECORD

       The admin dashboard uses the payments table as its revenue
       source. Therefore a completed booking must not be left without
       a corresponding payment record.

       Existing paid payments are preserved to avoid double revenue.
       Pending/failed existing payments are marked paid for the
       existing completion flow. If no payment exists, the system
       creates the existing default CASH payment.
    ===================================================== */

    $payment_id = null;
    $payment_status = null;

    $checkPayment = $conn->prepare("
        SELECT id, payment_status
        FROM payments
        WHERE booking_id = ?
        ORDER BY id DESC
        LIMIT 1
        FOR UPDATE
    ");

    if (!$checkPayment) {
        throw new Exception(
            'Failed to prepare payment verification: ' .
            $conn->error
        );
    }

    $checkPayment->bind_param(
        "i",
        $booking_id
    );

    if (!$checkPayment->execute()) {
        throw new Exception(
            'Failed to verify payment record: ' .
            $checkPayment->error
        );
    }

    $paymentResult = $checkPayment->get_result();
    $paymentRow = $paymentResult->fetch_assoc();
    $checkPayment->close();

    if ($paymentRow) {

        $payment_id = intval($paymentRow['id']);
        $payment_status = $paymentRow['payment_status'];

        if ($payment_status !== 'paid') {

            $updatePayment = $conn->prepare("
                UPDATE payments
                SET
                    amount = ?,
                    payment_status = 'paid'
                WHERE id = ?
            ");

            if (!$updatePayment) {
                throw new Exception(
                    'Failed to prepare payment update: ' .
                    $conn->error
                );
            }

            $bookingAmount = $booking_amount;

            $updatePayment->bind_param(
                "di",
                $bookingAmount,
                $payment_id
            );

            if (!$updatePayment->execute()) {
                throw new Exception(
                    'Failed to update payment record: ' .
                    $updatePayment->error
                );
            }

            $updatePayment->close();
        }

    } else {

        $bookingAmount = $booking_amount;

        $insertPayment = $conn->prepare("
            INSERT INTO payments (
                booking_id,
                amount,
                payment_method,
                payment_status
            )
            VALUES (?, ?, 'cash', 'paid')
        ");

        if (!$insertPayment) {
            throw new Exception(
                'Failed to prepare payment insert: ' .
                $conn->error
            );
        }

        $insertPayment->bind_param(
            "id",
            $booking_id,
            $bookingAmount
        );

        if (!$insertPayment->execute()) {
            throw new Exception(
                'Failed to create payment record: ' .
                $insertPayment->error
            );
        }

        $payment_id = $conn->insert_id;
        $payment_status = 'paid';

        $insertPayment->close();
    }


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
            $repair_photo,

        /* Added information for debugging/UI if needed */
        'labor_cost' =>
            number_format($labor_cost_amount, 2),

        'daily_rate_used' =>
            number_format($daily_rate, 2)
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

