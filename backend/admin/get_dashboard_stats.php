<?php

date_default_timezone_set('Asia/Manila');

header('Content-Type: application/json');

require_once '../config/database.php';

$response = [];


/* =========================================================
   KUNIN ANG MGA FILTERS
========================================================= */

$filter = $_GET['filter'] ?? 'all';

$start_date = $_GET['start_date'] ?? '';

$end_date = $_GET['end_date'] ?? '';


$date_condition = "";


/* =========================================================
   DATE FILTER LOGIC
========================================================= */

if ($filter === 'daily') {

    $date_condition =
        " AND DATE(b.created_at) = CURDATE()";

} elseif ($filter === 'weekly') {

    $date_condition =
        " AND YEARWEEK(b.created_at, 1) = YEARWEEK(CURDATE(), 1)";

} elseif ($filter === 'monthly') {

    $date_condition =
        " AND YEAR(b.created_at) = YEAR(CURDATE()) 
          AND MONTH(b.created_at) = MONTH(CURDATE())";

} elseif (
    $filter === 'custom' &&
    $start_date != '' &&
    $end_date != ''
) {

    $date_condition =
        " AND DATE(b.created_at) BETWEEN '$start_date' AND '$end_date'";
}


/* =========================================================
   0. KUNIN ANG SYSTEM SETTINGS
   DAILY VS PERCENTAGE MODE
========================================================= */

$settings = [];

$res_settings = $conn->query("
    SELECT setting_key, setting_value
    FROM system_settings
");

if ($res_settings) {

    while ($s_row = $res_settings->fetch_assoc()) {

        $settings[$s_row['setting_key']]
            = $s_row['setting_value'];
    }
}


$cost_mode =
    $settings['cost_mode'] ?? 'percentage';

$labor_percentage =
    floatval(
        $settings['labor_percentage'] ?? 30
    );


/* =========================================================
   DAILY RATE
=========================================================

   IMPORTANT:

   HINDI NA DIRETSO KUKUNIN ANG CURRENT
   system_settings.daily_rate PARA SA HISTORICAL JOBS.

   Ang gagamitin sa dashboard UI ay ang rate
   na effective TODAY.

   Example:

   Aug 16 = ₱800
   Aug 17 = ₱1,000

   Habang Aug 16 pa:

   current effective rate = ₱800

========================================================= */

$daily_rate = floatval(
    $settings['daily_rate'] ?? 800
);


/* =========================================================
   KUNIN ANG TODAY'S EFFECTIVE DAILY RATE
========================================================= */

$today_rate_query = $conn->query("
    SELECT daily_rate
    FROM daily_rate_history
    WHERE effective_date <= CURDATE()
    ORDER BY effective_date DESC
    LIMIT 1
");


if (
    $today_rate_query &&
    $today_rate_query->num_rows > 0
) {

    $today_rate_row =
        $today_rate_query->fetch_assoc();

    $daily_rate =
        floatval($today_rate_row['daily_rate']);
}


/* =========================================================
   SYSTEM CONFIG RESPONSE
========================================================= */

$response['config'] = [

    'mode' =>
        $cost_mode,

    'percentage' =>
        $labor_percentage,

    'daily_rate' =>
        $daily_rate
];


/* =========================================================
   1. TOTAL BOOKINGS
========================================================= */

$res = $conn->query("
    SELECT COUNT(*) as total
    FROM bookings b
    WHERE 1=1
    $date_condition
");

$response['total_bookings'] =
    $res->fetch_assoc()['total'] ?? 0;


/* =========================================================
   2. TOTAL REVENUE
   JOIN PAYMENTS AND BOOKINGS
========================================================= */

$res = $conn->query("
    SELECT SUM(p.amount) as total
    FROM payments p
    JOIN bookings b
        ON p.booking_id = b.id
    WHERE p.payment_status = 'paid'
    $date_condition
");


$rev_row =
    $res->fetch_assoc();


$total_revenue_raw =
    floatval(
        $rev_row['total'] ?? 0
    );


$response['total_revenue'] =
    number_format(
        $total_revenue_raw,
        2
    );


/* =========================================================
   3. LABOR COST AND NET PROFIT
   DAILY VS PERCENTAGE LOGIC
========================================================= */

if ($cost_mode === 'daily') {


    /* =====================================================
       DAILY SALARY MODE

       IMPORTANT:

       BAWAT COMPLETED JOB AY KUKUHA NG
       DAILY RATE NA EFFECTIVE SA DATE NG JOB.

       Example:

       Aug 16 job → ₱800
       Aug 17 job → ₱1,000

       Hindi:

       COUNT COMPLETED × CURRENT RATE

       Dahil mali iyon kapag nagkaroon ng
       rate change.
    ===================================================== */


    $res_completed = $conn->query("

        SELECT

            COUNT(*) AS total_completed,

            COALESCE(
                SUM(

                    COALESCE(

                        (
                            SELECT drh.daily_rate

                            FROM daily_rate_history drh

                           WHERE drh.effective_date
    <= b.booking_date

                            ORDER BY
                                drh.effective_date DESC

                            LIMIT 1
                        ),

                        $daily_rate

                    )

                ),

                0
            ) AS total_labor

        FROM bookings b

        WHERE b.status = 'completed'

        $date_condition

    ");


    if ($res_completed) {

        $completed_row =
            $res_completed->fetch_assoc();


        $completed_count =
            intval(
                $completed_row['total_completed'] ?? 0
            );


        $total_labor_raw =
            floatval(
                $completed_row['total_labor'] ?? 0
            );


        /*
         * SAFETY FALLBACK
         *
         * Kung walang result sa history,
         * gamitin ang currently effective rate.
         */

        if (
            $completed_count > 0 &&
            $total_labor_raw <= 0
        ) {

            $total_labor_raw =
                $completed_count *
                $daily_rate;
        }

    } else {

        /*
         * FALLBACK KAPAG MAY DATABASE QUERY ERROR
         */

        $res_completed_fallback = $conn->query("

            SELECT COUNT(*) AS total_completed

            FROM bookings b

            WHERE b.status = 'completed'

            $date_condition

        ");


        $completed_count = 0;

        if ($res_completed_fallback) {

            $completed_row =
                $res_completed_fallback->fetch_assoc();

            $completed_count =
                intval(
                    $completed_row['total_completed'] ?? 0
                );
        }


        $total_labor_raw =
            $completed_count *
            $daily_rate;
    }


} else {


    /* =====================================================
       PERCENTAGE MODE

       EXISTING LOGIC RETAINED
    ===================================================== */

    $res_labor = $conn->query("

        SELECT SUM(labor_cost_amount)
            AS total_labor

        FROM bookings b

        WHERE b.status = 'completed'

        $date_condition

    ");


    $total_labor_raw =
        floatval(
            $res_labor->fetch_assoc()['total_labor'] ?? 0
        );


    /* =====================================================
       FALLBACK KUNG WALANG NAKA-LOCK NA LABOR COST
    ===================================================== */

    if (
        $total_labor_raw == 0 &&
        $total_revenue_raw > 0
    ) {

        $total_labor_raw =
            $total_revenue_raw *
            ($labor_percentage / 100);
    }
}


/* =========================================================
   LABOR COST RESPONSE
========================================================= */

$response['labor_cost'] =
    number_format(
        $total_labor_raw,
        2
    );


/* =========================================================
   NET PROFIT
========================================================= */

$response['net_profit'] =
    number_format(
        $total_revenue_raw -
        $total_labor_raw,
        2
    );


/* =========================================================
   4. PENDING TASKS
========================================================= */

$res = $conn->query("

    SELECT COUNT(*) as total

    FROM bookings b

    WHERE b.status = 'pending'

    $date_condition

");


$response['pending_tasks'] =
    $res->fetch_assoc()['total'] ?? 0;


/* =========================================================
   5. ACTIVE TECHNICIANS
   REAL-TIME STATUS
========================================================= */

$res = $conn->query("

    SELECT COUNT(*) as total

    FROM users

    WHERE role = 'technician'

    AND status = 'active'

");


$response['active_techs'] =
    $res->fetch_assoc()['total'] ?? 0;


/* =========================================================
   6. RECENT BOOKINGS
========================================================= */

$sql = "

    SELECT

        b.id,

        u.full_name,

        s.service_name,

        b.booking_date,

        b.total_amount,

        b.status

    FROM bookings b

    LEFT JOIN users u
        ON b.user_id = u.id

    LEFT JOIN services s
        ON b.service_id = s.id

    WHERE 1=1

    $date_condition

    ORDER BY b.created_at DESC

    LIMIT 5

";


$res =
    $conn->query($sql);


$bookings = [];


if ($res) {

    while ($row = $res->fetch_assoc()) {

        $bookings[] = $row;
    }
}


$response['recent_bookings'] =
    $bookings;


/* =========================================================
   RETURN JSON
========================================================= */

echo json_encode($response);


/* =========================================================
   CLOSE DATABASE
========================================================= */

$conn->close();

?>