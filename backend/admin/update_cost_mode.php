<?php

ob_start();
session_start();

header('Content-Type: application/json');

error_reporting(0);
ini_set('display_errors', 0);


/* ============================================================
   1. ADMIN AUTHENTICATION CHECK
============================================================ */

$isAdmin = false;

if (
    isset($_SESSION['role']) &&
    strtolower($_SESSION['role']) === 'admin'
) {
    $isAdmin = true;

} elseif (
    isset($_SESSION['user_type']) &&
    strtolower($_SESSION['user_type']) === 'admin'
) {
    $isAdmin = true;

} elseif (
    isset($_SESSION['admin_id']) ||
    isset($_SESSION['user_id'])
) {
    $isAdmin = true;
}


if (!$isAdmin) {

    ob_clean();

    echo json_encode([
        'success' => false,
        'message' => 'Unauthorized access. Please log in again.'
    ]);

    exit;
}


/* ============================================================
   2. DATABASE CONNECTION
============================================================ */

$db_path = __DIR__ . '/../config/database.php';


if (!file_exists($db_path)) {

    ob_clean();

    echo json_encode([
        'success' => false,
        'message' =>
            'Database file not found at backend/config/database.php'
    ]);

    exit;
}


require_once $db_path;


if (
    !isset($conn) ||
    $conn->connect_error
) {

    ob_clean();

    echo json_encode([
        'success' => false,
        'message' =>
            'Database connection failed: ' .
            ($conn
                ? $conn->connect_error
                : 'Connection variable $conn not found')
    ]);

    exit;
}


/* ============================================================
   3. READ JSON PAYLOAD
============================================================ */

$input = json_decode(
    file_get_contents('php://input'),
    true
);


if (
    !$input ||
    !isset($input['value'])
) {

    ob_clean();

    echo json_encode([
        'success' => false,
        'message' =>
            'Invalid or missing daily rate value.'
    ]);

    exit;
}


$daily_rate =
    floatval($input['value']);


/* ============================================================
   4. VALIDATE DAILY RATE
============================================================ */

if ($daily_rate <= 0) {

    ob_clean();

    echo json_encode([
        'success' => false,
        'message' =>
            'Daily rate must be greater than zero.'
    ]);

    exit;
}


/* ============================================================
   5. NEXT-DAY EFFECTIVE DATE
============================================================ */

$effective_date = date(
    'Y-m-d',
    strtotime('+1 day')
);


try {

    /* ========================================================
       START TRANSACTION
    ======================================================== */

    $conn->begin_transaction();


    /* ========================================================
       6. CHECK EXISTING RATE FOR TOMORROW
    ======================================================== */

    $checkStmt = $conn->prepare("
        SELECT id
        FROM daily_rate_history
        WHERE effective_date = ?
        LIMIT 1
    ");


    if (!$checkStmt) {

        throw new Exception(
            'Failed to prepare daily rate history check: ' .
            $conn->error
        );
    }


    $checkStmt->bind_param(
        "s",
        $effective_date
    );


    if (!$checkStmt->execute()) {

        throw new Exception(
            'Failed to check daily rate history: ' .
            $checkStmt->error
        );
    }


    $checkResult =
        $checkStmt->get_result();


    /* ========================================================
       7. UPDATE EXISTING TOMORROW RATE
    ======================================================== */

    if (
        $checkResult &&
        $checkResult->num_rows > 0
    ) {

        $existingRate =
            $checkResult->fetch_assoc();


        $historyId =
            intval($existingRate['id']);


        $updateHistoryStmt = $conn->prepare("
            UPDATE daily_rate_history
            SET daily_rate = ?
            WHERE id = ?
        ");


        if (!$updateHistoryStmt) {

            throw new Exception(
                'Failed to prepare future rate update: ' .
                $conn->error
            );
        }


        $updateHistoryStmt->bind_param(
            "di",
            $daily_rate,
            $historyId
        );


        if (!$updateHistoryStmt->execute()) {

            throw new Exception(
                'Failed to update future daily rate: ' .
                $updateHistoryStmt->error
            );
        }


        $updateHistoryStmt->close();

    } else {


        /* ====================================================
           8. CREATE TOMORROW'S RATE
        ==================================================== */

        $insertHistoryStmt = $conn->prepare("
            INSERT INTO daily_rate_history
            (
                daily_rate,
                effective_date
            )
            VALUES
            (
                ?,
                ?
            )
        ");


        if (!$insertHistoryStmt) {

            throw new Exception(
                'Failed to prepare future rate insert: ' .
                $conn->error
            );
        }


        $insertHistoryStmt->bind_param(
            "ds",
            $daily_rate,
            $effective_date
        );


        if (!$insertHistoryStmt->execute()) {

            throw new Exception(
                'Failed to create future daily rate: ' .
                $insertHistoryStmt->error
            );
        }


        $insertHistoryStmt->close();
    }


    $checkStmt->close();


    /* ========================================================
       9. SET COST MODE TO DAILY
    ========================================================

       IMPORTANT:

       Dito natin inaayos ang pangunahing problema.

       BEFORE:
           cost_mode = percentage

       AFTER:
           cost_mode = daily

       Kaya gagamit na ang dashboard ng
       daily_rate_history para sa completed jobs.
    ======================================================== */

    $modeStmt = $conn->prepare("
        INSERT INTO system_settings
        (
            setting_key,
            setting_value
        )
        VALUES
        (
            'cost_mode',
            'daily'
        )
        ON DUPLICATE KEY UPDATE
            setting_value = 'daily'
    ");


    if (!$modeStmt) {

        throw new Exception(
            'Failed to prepare cost mode update: ' .
            $conn->error
        );
    }


    if (!$modeStmt->execute()) {

        throw new Exception(
            'Failed to set daily cost mode: ' .
            $modeStmt->error
        );
    }


    $modeStmt->close();


    /* ========================================================
       10. KEEP SYSTEM SETTINGS DAILY RATE
    ========================================================

       IMPORTANT:

       Hindi natin gagamitin ito bilang historical rate.

       Ang historical/effective rates ay nasa:

           daily_rate_history

       Pero retained ang system_settings.daily_rate
       para compatible sa existing dashboard/UI.
    ======================================================== */

    $rateStmt = $conn->prepare("
        INSERT INTO system_settings
        (
            setting_key,
            setting_value
        )
        VALUES
        (
            'daily_rate',
            ?
        )
        ON DUPLICATE KEY UPDATE
            setting_value = ?
    ");


    if (!$rateStmt) {

        throw new Exception(
            'Failed to prepare daily rate settings update: ' .
            $conn->error
        );
    }


    $rateString =
        number_format(
            $daily_rate,
            2,
            '.',
            ''
        );


    $rateStmt->bind_param(
        "ss",
        $rateString,
        $rateString
    );


    if (!$rateStmt->execute()) {

        throw new Exception(
            'Failed to update system daily rate: ' .
            $rateStmt->error
        );
    }


    $rateStmt->close();


    /* ========================================================
       11. COMMIT
    ======================================================== */

    $conn->commit();


    /* ========================================================
       12. SUCCESS RESPONSE
    ======================================================== */

    ob_clean();

    echo json_encode([

        'success' => true,

        'message' =>
            'Daily salary mode activated successfully. ' .
            'The new rate of ₱' .
            number_format($daily_rate, 2) .
            ' will take effect on ' .
            date(
                'F d, Y',
                strtotime($effective_date)
            ) .
            '.',

        'daily_rate' =>
            $daily_rate,

        'effective_date' =>
            $effective_date,

        'cost_mode' =>
            'daily'
    ]);


} catch (Exception $e) {


    /* ========================================================
       ROLLBACK
    ======================================================== */

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


    /* ========================================================
       LOG ERROR
    ======================================================== */

    error_log(
        'Daily Rate Update Error: ' .
        $e->getMessage()
    );


    /* ========================================================
       RETURN ERROR
    ======================================================== */

    ob_clean();

    echo json_encode([

        'success' => false,

        'message' =>
            'Database error: ' .
            $e->getMessage()
    ]);
}


/* ============================================================
   CLOSE DATABASE
============================================================ */

$conn->close();

?>