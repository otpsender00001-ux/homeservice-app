<?php

date_default_timezone_set('Asia/Manila');

header('Content-Type: application/json');

require_once '../../config/database.php';


/* =========================================================
   BASIC RESPONSE
========================================================= */

$response = [
    'success' => false
];


/* =========================================================
   HELPERS
========================================================= */

function sendError($message)
{
    echo json_encode([
        'success' => false,
        'message' => $message
    ], JSON_UNESCAPED_UNICODE);

    exit;
}


function moneyValue($value)
{
    return round(floatval($value ?? 0), 2);
}


function safeQuery($conn, $sql)
{
    $result = $conn->query($sql);

    if ($result === false) {
        return false;
    }

    return $result;
}


/* =========================================================
   DATABASE CHECK
========================================================= */

if (!isset($conn) || !$conn) {

    sendError(
        'Database connection is not available.'
    );

}


/* =========================================================
   GET PERIOD
========================================================= */

$period =
    $_GET['period'] ?? 'daily';


$today =
    date('Y-m-d');


$start_date =
    '';


$end_date =
    '';


$period_label =
    '';


/* =========================================================
   PERIOD VALIDATION
========================================================= */

if ($period === 'daily') {

    $start_date =
        $_GET['date'] ?? $today;

    if (
        !preg_match(
            '/^\d{4}-\d{2}-\d{2}$/',
            $start_date
        )
    ) {

        sendError(
            'Invalid date format.'
        );

    }

    $end_date =
        $start_date;

    $period_label =
        'Daily Report — ' .
        date(
            'F d, Y',
            strtotime($start_date)
        );

}


elseif ($period === 'monthly') {

    $month =
        $_GET['month'] ??
        date('Y-m');

    if (
        !preg_match(
            '/^\d{4}-\d{2}$/',
            $month
        )
    ) {

        sendError(
            'Invalid month format.'
        );

    }

    $start_date =
        $month . '-01';

    $end_date =
        date(
            'Y-m-t',
            strtotime($start_date)
        );

    $period_label =
        'Monthly Report — ' .
        date(
            'F Y',
            strtotime($start_date)
        );

}


elseif ($period === 'yearly') {

    $year =
        intval(
            $_GET['year'] ??
            date('Y')
        );


    if (
        $year < 2000 ||
        $year > 2100
    ) {

        sendError(
            'Invalid year.'
        );

    }


    $start_date =
        $year . '-01-01';

    $end_date =
        $year . '-12-31';

    $period_label =
        'Yearly Report — ' .
        $year;

}


elseif ($period === 'custom') {

    $start_date =
        $_GET['start_date'] ?? '';

    $end_date =
        $_GET['end_date'] ?? '';


    if (
        !$start_date ||
        !$end_date
    ) {

        sendError(
            'Please provide both start and end dates.'
        );

    }


    if (
        !preg_match(
            '/^\d{4}-\d{2}-\d{2}$/',
            $start_date
        ) ||
        !preg_match(
            '/^\d{4}-\d{2}-\d{2}$/',
            $end_date
        )
    ) {

        sendError(
            'Invalid custom date range.'
        );

    }


    if (
        !strtotime($start_date) ||
        !strtotime($end_date)
    ) {

        sendError(
            'Invalid custom date range.'
        );

    }


    if (
        $start_date > $end_date
    ) {

        sendError(
            'Start date cannot be later than end date.'
        );

    }


    $period_label =
        'Custom Report — ' .
        date(
            'M d, Y',
            strtotime($start_date)
        ) .
        ' to ' .
        date(
            'M d, Y',
            strtotime($end_date)
        );

}


else {

    sendError(
        'Invalid report period.'
    );

}


/* =========================================================
   ESCAPE DATES
========================================================= */

$start_safe =
    $conn->real_escape_string(
        $start_date
    );

$end_safe =
    $conn->real_escape_string(
        $end_date
    );


/*
 * Reports are based on the actual
 * booking/service date.
 */

$date_condition =
    " AND DATE(b.booking_date)
      BETWEEN '$start_safe'
      AND '$end_safe'";


/* =========================================================
   SYSTEM SETTINGS
========================================================= */

$settings = [];


$settings_result =
    safeQuery(
        $conn,
        "
        SELECT
            setting_key,
            setting_value
        FROM system_settings
        "
    );


if ($settings_result) {

    while (
        $row =
        $settings_result->fetch_assoc()
    ) {

        $settings[
            $row['setting_key']
        ] =
            $row['setting_value'];

    }

}


$cost_mode =
    $settings['cost_mode']
    ?? 'percentage';


$labor_percentage =
    floatval(
        $settings['labor_percentage']
        ?? 30
    );


$current_daily_rate =
    floatval(
        $settings['daily_rate']
        ?? 800
    );


/* =========================================================
   HISTORICAL DAILY RATE
========================================================= */

/*
 * Get the latest rate currently configured.
 * Actual booking labor calculation below uses
 * the rate effective on each booking date.
 */

$rate_query =
    safeQuery(
        $conn,
        "
        SELECT
            daily_rate
        FROM daily_rate_history
        WHERE effective_date <= '$end_safe'
        ORDER BY effective_date DESC
        LIMIT 1
        "
    );


if (
    $rate_query &&
    $rate_query->num_rows > 0
) {

    $rate_row =
        $rate_query->fetch_assoc();

    $current_daily_rate =
        floatval(
            $rate_row['daily_rate']
        );

}


/* =========================================================
   SUMMARY
========================================================= */


/* =========================================================
   TOTAL BOOKINGS
========================================================= */

$total_bookings = 0;


$result =
    safeQuery(
        $conn,
        "
        SELECT
            COUNT(*) AS total
        FROM bookings b
        WHERE 1=1
        $date_condition
        "
    );


if ($result) {

    $total_bookings =
        intval(
            $result->fetch_assoc()['total']
            ?? 0
        );

}


/* =========================================================
   STATUS COUNTS
========================================================= */

$status_counts = [];


$result =
    safeQuery(
        $conn,
        "
        SELECT
            b.status,
            COUNT(*) AS total
        FROM bookings b
        WHERE 1=1
        $date_condition
        GROUP BY b.status
        "
    );


if ($result) {

    while (
        $row =
        $result->fetch_assoc()
    ) {

        $status_counts[
            $row['status']
        ] =
            intval(
                $row['total']
            );

    }

}


$completed_jobs =
    $status_counts['completed']
    ?? 0;


$pending_jobs =
    $status_counts['pending']
    ?? 0;


$cancelled_jobs =
    $status_counts['cancelled']
    ?? 0;


/* =========================================================
   PAID REVENUE
========================================================= */

$paid_revenue = 0;


$result =
    safeQuery(
        $conn,
        "
        SELECT
            COALESCE(
                SUM(p.amount),
                0
            ) AS total
        FROM payments p
        INNER JOIN bookings b
            ON p.booking_id = b.id
        WHERE p.payment_status = 'paid'
        $date_condition
        "
    );


if ($result) {

    $paid_revenue =
        moneyValue(
            $result->fetch_assoc()['total']
            ?? 0
        );

}


/* =========================================================
   AVERAGE BOOKING VALUE
========================================================= */

$average_booking_value =
    $total_bookings > 0
    ? moneyValue(
        $paid_revenue /
        $total_bookings
    )
    : 0;


/* =========================================================
   LABOR COST
========================================================= */

$labor_cost = 0;


if ($cost_mode === 'daily') {

    /*
     * Historical daily rate is selected
     * according to the booking date.
     */

    $result =
        safeQuery(
            $conn,
            "
            SELECT
                COALESCE(
                    SUM(
                        COALESCE(
                            (
                                SELECT
                                    drh.daily_rate
                                FROM daily_rate_history drh
                                WHERE
                                    drh.effective_date
                                    <= DATE(b.booking_date)
                                ORDER BY
                                    drh.effective_date DESC
                                LIMIT 1
                            ),
                            $current_daily_rate
                        )
                    ),
                    0
                ) AS total_labor

            FROM bookings b

            WHERE
                b.status = 'completed'

                $date_condition
            "
        );


    if ($result) {

        $labor_cost =
            moneyValue(
                $result->fetch_assoc()[
                    'total_labor'
                ] ?? 0
            );

    }

}


else {

    /*
     * Percentage / stored labor cost mode.
     */

    $result =
        safeQuery(
            $conn,
            "
            SELECT
                COALESCE(
                    SUM(
                        COALESCE(
                            labor_cost_amount,
                            0
                        )
                    ),
                    0
                ) AS total_labor

            FROM bookings b

            WHERE
                b.status = 'completed'

                $date_condition
            "
        );


    if ($result) {

        $labor_cost =
            moneyValue(
                $result->fetch_assoc()[
                    'total_labor'
                ] ?? 0
            );

    }


    /*
     * Same fallback principle as
     * the existing dashboard.
     */

    if (
        $labor_cost == 0 &&
        $paid_revenue > 0
    ) {

        $labor_cost =
            moneyValue(
                $paid_revenue *
                (
                    $labor_percentage /
                    100
                )
            );

    }

}


$net_profit =
    moneyValue(
        $paid_revenue -
        $labor_cost
    );


$completion_rate =
    $total_bookings > 0
    ? (
        $completed_jobs /
        $total_bookings
    ) * 100
    : 0;


/* =========================================================
   CANCELLATION RATE
========================================================= */

$cancellation_rate =
    $total_bookings > 0
    ? (
        $cancelled_jobs /
        $total_bookings
    ) * 100
    : 0;


$cancellation_rate =
    round(
        $cancellation_rate,
        1
    );


/* =========================================================
   AVERAGE RATING
========================================================= */

$average_rating = 0;


$result =
    safeQuery(
        $conn,
        "
        SELECT
            COALESCE(
                AVG(r.rating),
                0
            ) AS average_rating

        FROM reviews r

        INNER JOIN bookings b
            ON r.booking_id = b.id

        WHERE 1=1

        $date_condition
        "
    );


if ($result) {

    $average_rating =
        round(
            floatval(
                $result->fetch_assoc()[
                    'average_rating'
                ] ?? 0
            ),
            1
        );

}


/* =========================================================
   PAYMENT METHODS
========================================================= */

$payments = [
    'cash' => 0,
    'gcash' => 0,
    'card' => 0,
    'pending_count' => 0,
    'failed_count' => 0
];


$result =
    safeQuery(
        $conn,
        "
        SELECT
            p.payment_method,

            COALESCE(
                SUM(
                    CASE
                        WHEN p.payment_status = 'paid'
                        THEN p.amount
                        ELSE 0
                    END
                ),
                0
            ) AS total

        FROM payments p

        INNER JOIN bookings b
            ON p.booking_id = b.id

        WHERE 1=1

        $date_condition

        GROUP BY
            p.payment_method
        "
    );


if ($result) {

    while (
        $row =
        $result->fetch_assoc()
    ) {

        $method =
            strtolower(
                trim(
                    $row['payment_method']
                    ?? ''
                )
            );

        if (
            array_key_exists(
                $method,
                $payments
            )
        ) {

            $payments[$method] =
                moneyValue(
                    $row['total']
                );

        }

    }

}


/* =========================================================
   PAYMENT STATUS COUNTS
========================================================= */

$result =
    safeQuery(
        $conn,
        "
        SELECT
            p.payment_status,
            COUNT(*) AS total

        FROM payments p

        INNER JOIN bookings b
            ON p.booking_id = b.id

        WHERE 1=1

        $date_condition

        GROUP BY
            p.payment_status
        "
    );


if ($result) {

    while (
        $row =
        $result->fetch_assoc()
    ) {

        $payment_status =
            strtolower(
                trim(
                    $row['payment_status']
                    ?? ''
                )
            );


        if (
            $payment_status === 'pending'
        ) {

            $payments['pending_count'] =
                intval(
                    $row['total']
                );

        }


        if (
            $payment_status === 'failed'
        ) {

            $payments['failed_count'] =
                intval(
                    $row['total']
                );

        }

    }

}


/* =========================================================
   BOOKING TREND
========================================================= */

$booking_trend = [];


$days_difference =
    (
        strtotime($end_date) -
        strtotime($start_date)
    ) / 86400;


if ($days_difference <= 62) {

    $trend_group =
        "DATE(b.booking_date)";

}

else {

    $trend_group =
        "DATE_FORMAT(
            b.booking_date,
            '%Y-%m'
        )";

}


$result =
    safeQuery(
        $conn,
        "
        SELECT

            $trend_group AS trend_date,

            COUNT(*) AS total

        FROM bookings b

        WHERE 1=1

        $date_condition

        GROUP BY
            trend_date

        ORDER BY
            trend_date ASC
        "
    );


if ($result) {

    while (
        $row =
        $result->fetch_assoc()
    ) {

        $label =
            date(
                $days_difference <= 62
                ? 'M d'
                : 'M Y',
                strtotime(
                    $row['trend_date']
                )
            );


        $booking_trend[] = [

            'label' =>
                $label,

            'count' =>
                intval(
                    $row['total']
                )

        ];

    }

}


/* =========================================================
   SERVICE PERFORMANCE
========================================================= */

$services = [];


$result =
    safeQuery(
        $conn,
        "
        SELECT

            s.id,

            s.service_name,

            COUNT(b.id) AS bookings,

            SUM(
                CASE
                    WHEN b.status = 'completed'
                    THEN 1
                    ELSE 0
                END
            ) AS completed,

            COALESCE(
                (
                    SELECT
                        SUM(p.amount)

                    FROM payments p

                    INNER JOIN bookings pb
                        ON p.booking_id = pb.id

                    WHERE
                        pb.service_id = s.id

                        AND p.payment_status = 'paid'

                        AND DATE(pb.booking_date)
                            BETWEEN '$start_safe'
                            AND '$end_safe'
                ),
                0
            ) AS revenue,

            COALESCE(
                (
                    SELECT
                        AVG(r.rating)

                    FROM reviews r

                    INNER JOIN bookings rb
                        ON r.booking_id = rb.id

                    WHERE
                        rb.service_id = s.id

                        AND DATE(rb.booking_date)
                            BETWEEN '$start_safe'
                            AND '$end_safe'
                ),
                0
            ) AS average_rating

        FROM services s

        INNER JOIN bookings b
            ON b.service_id = s.id

        WHERE 1=1

        $date_condition

        GROUP BY
            s.id,
            s.service_name

        ORDER BY
            bookings DESC

        LIMIT 15
        "
    );


if ($result) {

    while (
        $row =
        $result->fetch_assoc()
    ) {

        $services[] = [

            'service_name' =>
                $row['service_name'],

            'bookings' =>
                intval(
                    $row['bookings']
                ),

            'completed' =>
                intval(
                    $row['completed']
                ),

            'revenue' =>
                moneyValue(
                    $row['revenue']
                ),

            'average_rating' =>
                round(
                    floatval(
                        $row['average_rating']
                    ),
                    1
                )

        ];

    }

}


/* =========================================================
   TECHNICIAN PERFORMANCE
========================================================= */

$technicians = [];


$result =
    safeQuery(
        $conn,
        "
        SELECT

            u.id,

            u.full_name,

            COUNT(
                DISTINCT b.id
            ) AS assigned,

            COUNT(
                DISTINCT CASE
                    WHEN b.status = 'completed'
                    THEN b.id
                END
            ) AS completed,

            COALESCE(
                (
                    SELECT
                        AVG(r.rating)

                    FROM reviews r

                    INNER JOIN bookings rb
                        ON r.booking_id = rb.id

                    WHERE
                        rb.technician_id = u.id

                        AND DATE(rb.booking_date)
                            BETWEEN '$start_safe'
                            AND '$end_safe'
                ),
                0
            ) AS average_rating,

            COALESCE(
                SUM(
                    CASE
                        WHEN b.status = 'completed'
                        THEN b.labor_cost_amount
                        ELSE 0
                    END
                ),
                0
            ) AS labor_cost

        FROM users u

        INNER JOIN bookings b
            ON b.technician_id = u.id

        WHERE

            u.role = 'technician'

            $date_condition

        GROUP BY
            u.id,
            u.full_name

        ORDER BY
            completed DESC
        "
    );


if ($result) {

    while (
        $row =
        $result->fetch_assoc()
    ) {

        $assigned =
            intval(
                $row['assigned']
            );

        $completed =
            intval(
                $row['completed']
            );


        $technicians[] = [

            'full_name' =>
                $row['full_name'],

            'assigned' =>
                $assigned,

            'completed' =>
                $completed,

            'completion_rate' =>
                $assigned > 0
                ? (
                    $completed /
                    $assigned
                ) * 100
                : 0,

            'average_rating' =>
                round(
                    floatval(
                        $row['average_rating']
                    ),
                    1
                ),

            'labor_cost' =>
                moneyValue(
                    $row['labor_cost']
                )

        ];

    }

}


/* =========================================================
   CUSTOMER ANALYTICS
========================================================= */

$total_customers = 0;


$result =
    safeQuery(
        $conn,
        "
        SELECT
            COUNT(
                DISTINCT b.user_id
            ) AS total

        FROM bookings b

        WHERE 1=1

        $date_condition
        "
    );


if ($result) {

    $total_customers =
        intval(
            $result->fetch_assoc()['total']
            ?? 0
        );

}


/* =========================================================
   NEW CUSTOMERS
========================================================= */

$new_customers = 0;


$result =
    safeQuery(
        $conn,
        "
        SELECT
            COUNT(*) AS total

        FROM users u

        WHERE
            u.role = 'user'

            AND DATE(u.created_at)
                BETWEEN '$start_safe'
                AND '$end_safe'
        "
    );


if ($result) {

    $new_customers =
        intval(
            $result->fetch_assoc()['total']
            ?? 0
        );

}


/* =========================================================
   RETURNING CUSTOMERS
========================================================= */

$returning_customers = 0;


$result =
    safeQuery(
        $conn,
        "
        SELECT
            COUNT(*) AS total

        FROM (

            SELECT
                b.user_id

            FROM bookings b

            WHERE 1=1

            $date_condition

            GROUP BY
                b.user_id

            HAVING
                COUNT(*) > 1

        ) AS returning_users
        "
    );


if ($result) {

    $returning_customers =
        intval(
            $result->fetch_assoc()['total']
            ?? 0
        );

}


/* =========================================================
   TOTAL REVIEWS
========================================================= */

$total_reviews = 0;


$result =
    safeQuery(
        $conn,
        "
        SELECT
            COUNT(*) AS total

        FROM reviews r

        INNER JOIN bookings b
            ON r.booking_id = b.id

        WHERE 1=1

        $date_condition
        "
    );


if ($result) {

    $total_reviews =
        intval(
            $result->fetch_assoc()['total']
            ?? 0
        );

}


/* =========================================================
   COMPLETION REPORTS
========================================================= */

$completion_reports = 0;

$replacement_cost = 0;

$replaced_parts_jobs = 0;


$result =
    safeQuery(
        $conn,
        "
        SELECT

            COUNT(*) AS total,

            COALESCE(
                SUM(
                    replacement_cost
                ),
                0
            ) AS replacement_cost,

            SUM(
                CASE
                    WHEN
                        replaced_parts IS NOT NULL
                        AND TRIM(replaced_parts) != ''
                    THEN 1
                    ELSE 0
                END
            ) AS replaced_parts_jobs

        FROM job_completion_reports jcr

        INNER JOIN bookings b
            ON jcr.booking_id = b.id

        WHERE 1=1

        $date_condition
        "
    );


if ($result) {

    $completion_row =
        $result->fetch_assoc();


    $completion_reports =
        intval(
            $completion_row['total']
            ?? 0
        );


    $replacement_cost =
        moneyValue(
            $completion_row[
                'replacement_cost'
            ] ?? 0
        );


    $replaced_parts_jobs =
        intval(
            $completion_row[
                'replaced_parts_jobs'
            ] ?? 0
        );

}


/* =========================================================
   DETAILED BOOKING RECORDS
========================================================= */

$records = [];


$result =
    safeQuery(
        $conn,
        "
        SELECT

            b.id,

            b.booking_date,

            b.total_amount,

            b.status,

            u.full_name
                AS customer_name,

            s.service_name,

            tech.full_name
                AS technician_name,

            COALESCE(
                (
                    SELECT
                        p.payment_status

                    FROM payments p

                    WHERE
                        p.booking_id = b.id

                    ORDER BY
                        p.created_at DESC,
                        p.id DESC

                    LIMIT 1
                ),
                'unpaid'
            ) AS payment_status

        FROM bookings b

        LEFT JOIN users u
            ON b.user_id = u.id

        LEFT JOIN services s
            ON b.service_id = s.id

        LEFT JOIN users tech
            ON b.technician_id = tech.id

        WHERE 1=1

        $date_condition

        ORDER BY
            b.booking_date DESC,
            b.id DESC

        LIMIT 1000
        "
    );


if ($result) {

    while (
        $row =
        $result->fetch_assoc()
    ) {

        $records[] = [

            'id' =>
                intval(
                    $row['id']
                ),

            'booking_date' =>
                $row['booking_date'],

            'customer_name' =>
                $row['customer_name'],

            'service_name' =>
                $row['service_name'],

            'technician_name' =>
                $row['technician_name'],

            'total_amount' =>
                moneyValue(
                    $row['total_amount']
                ),

            'payment_status' =>
                $row['payment_status'],

            'status' =>
                $row['status']

        ];

    }

}


/* =========================================================
   ADVANCED MANAGEMENT ANALYTICS V2
========================================================= */


/* =========================================================
   PERIOD LENGTH
========================================================= */

$report_days =
    (
        strtotime($end_date) -
        strtotime($start_date)
    ) / 86400 + 1;


/* =========================================================
   PREVIOUS COMPARISON PERIOD
========================================================= */

$previous_end_date =
    date(
        'Y-m-d',
        strtotime(
            $start_date .
            ' -1 day'
        )
    );


$previous_start_date =
    date(
        'Y-m-d',
        strtotime(
            $previous_end_date .
            ' -' .
            ($report_days - 1) .
            ' days'
        )
    );


$previous_start_safe =
    $conn->real_escape_string(
        $previous_start_date
    );


$previous_end_safe =
    $conn->real_escape_string(
        $previous_end_date
    );


$previous_date_condition =
    " AND DATE(b.booking_date)
      BETWEEN '$previous_start_safe'
      AND '$previous_end_safe'";


/* =========================================================
   PREVIOUS PERIOD CORE METRICS
========================================================= */

$previous_total_bookings = 0;

$previous_completed_jobs = 0;

$previous_cancelled_jobs = 0;

$previous_paid_revenue = 0;

$previous_average_rating = 0;


/* =========================================================
   PREVIOUS BOOKING METRICS
========================================================= */

$result =
    safeQuery(
        $conn,
        "
        SELECT

            COUNT(*) AS total_bookings,

            SUM(
                CASE
                    WHEN b.status = 'completed'
                    THEN 1
                    ELSE 0
                END
            ) AS completed_jobs,

            SUM(
                CASE
                    WHEN b.status = 'cancelled'
                    THEN 1
                    ELSE 0
                END
            ) AS cancelled_jobs

        FROM bookings b

        WHERE 1=1

        $previous_date_condition
        "
    );


if ($result) {

    $row =
        $result->fetch_assoc();


    $previous_total_bookings =
        intval(
            $row['total_bookings']
            ?? 0
        );


    $previous_completed_jobs =
        intval(
            $row['completed_jobs']
            ?? 0
        );


    $previous_cancelled_jobs =
        intval(
            $row['cancelled_jobs']
            ?? 0
        );

}


/* =========================================================
   PREVIOUS PAID REVENUE
========================================================= */

$result =
    safeQuery(
        $conn,
        "
        SELECT

            COALESCE(
                SUM(
                    CASE
                        WHEN p.payment_status = 'paid'
                        THEN p.amount
                        ELSE 0
                    END
                ),
                0
            ) AS paid_revenue

        FROM payments p

        INNER JOIN bookings b
            ON p.booking_id = b.id

        WHERE 1=1

        $previous_date_condition
        "
    );


if ($result) {

    $previous_paid_revenue =
        moneyValue(
            $result->fetch_assoc()[
                'paid_revenue'
            ] ?? 0
        );

}


/* =========================================================
   PREVIOUS AVERAGE RATING
========================================================= */

$result =
    safeQuery(
        $conn,
        "
        SELECT

            COALESCE(
                AVG(r.rating),
                0
            ) AS average_rating

        FROM reviews r

        INNER JOIN bookings b
            ON r.booking_id = b.id

        WHERE 1=1

        $previous_date_condition
        "
    );


if ($result) {

    $previous_average_rating =
        round(
            floatval(
                $result->fetch_assoc()[
                    'average_rating'
                ] ?? 0
            ),
            1
        );

}


/* =========================================================
   SAFE PERCENTAGE CHANGE
========================================================= */

$calculateChange =
    function (
        $current,
        $previous
    ) {

        $current =
            floatval(
                $current
            );


        $previous =
            floatval(
                $previous
            );


        if (
            $previous == 0
        ) {

            if (
                $current == 0
            ) {

                return 0;

            }


            return null;

        }


        return round(
            (
                (
                    $current -
                    $previous
                ) /
                abs($previous)
            ) * 100,
            1
        );

    };


/* =========================================================
   OUTSTANDING PAYMENT AMOUNT
========================================================= */

$booking_total = 0;

$paid_total = 0;

$outstanding_payment_amount = 0;


/* =========================================================
   TOTAL BOOKING AMOUNT
========================================================= */

$result =
    safeQuery(
        $conn,
        "
        SELECT

            COALESCE(
                SUM(
                    CASE
                        WHEN b.total_amount IS NOT NULL
                        THEN b.total_amount
                        ELSE 0
                    END
                ),
                0
            ) AS booking_total

        FROM bookings b

        WHERE 1=1

        $date_condition
        "
    );


if ($result) {

    $row =
        $result->fetch_assoc();


    $booking_total =
        moneyValue(
            $row['booking_total']
            ?? 0
        );

}


/* =========================================================
   TOTAL SUCCESSFULLY PAID
========================================================= */

$result =
    safeQuery(
        $conn,
        "
        SELECT

            COALESCE(
                SUM(
                    CASE
                        WHEN p.payment_status = 'paid'
                        THEN p.amount
                        ELSE 0
                    END
                ),
                0
            ) AS paid_total

        FROM payments p

        INNER JOIN bookings b
            ON p.booking_id = b.id

        WHERE 1=1

        $date_condition
        "
    );


/*
 * FIX:
 *
 * The previous code queried paid_total but
 * never assigned it to $paid_total.
 */

if ($result) {

    $paid_total =
        moneyValue(
            $result->fetch_assoc()[
                'paid_total'
            ] ?? 0
        );

}


/* =========================================================
   OUTSTANDING AMOUNT
========================================================= */

$outstanding_payment_amount =
    max(
        0,
        $booking_total -
        $paid_total
    );


/* =========================================================
   PAYMENT COLLECTION RATE
========================================================= */

$payment_collection_rate =
    $booking_total > 0
    ? (
        $paid_total /
        $booking_total
    ) * 100
    : 0;


$payment_collection_rate =
    round(
        min(
            100,
            max(
                0,
                $payment_collection_rate
            )
        ),
        1
    );


/* =========================================================
   ESTIMATED OPERATING MARGIN
========================================================= */

$estimated_operating_margin =
    moneyValue(
        $paid_revenue -
        $labor_cost
    );


$estimated_margin_rate =
    $paid_revenue > 0
    ? (
        $estimated_operating_margin /
        $paid_revenue
    ) * 100
    : 0;


$estimated_margin_rate =
    round(
        $estimated_margin_rate,
        1
    );


/* =========================================================
   CAPACITY / SLOT ANALYSIS
========================================================= */

$capacity_analysis = [

    'configured_capacity' =>
        0,

    'booked_slots' =>
        0,

    'available_capacity' =>
        0,

    'utilization_rate' =>
        0,

    'full_slots' =>
        0,

    'underutilized_slots' =>
        0

];


$result =
    safeQuery(
        $conn,
        "
        SELECT

            COALESCE(
                SUM(ts.max_capacity),
                0
            ) AS configured_capacity,

            COALESCE(
                SUM(
                    CASE
                        WHEN booked.total_bookings
                             IS NOT NULL
                        THEN booked.total_bookings
                        ELSE 0
                    END
                ),
                0
            ) AS booked_slots,

            COUNT(
                CASE
                    WHEN
                        booked.total_bookings
                        >= ts.max_capacity
                    THEN 1
                END
            ) AS full_slots,

            COUNT(
                CASE
                    WHEN
                        booked.total_bookings IS NULL

                        OR

                        booked.total_bookings <
                        (ts.max_capacity * 0.50)

                    THEN 1
                END
            ) AS underutilized_slots

        FROM time_slots ts

        LEFT JOIN (

            SELECT

                b.booking_date,

                b.time_start,

                b.time_end,

                COUNT(*) AS total_bookings

            FROM bookings b

            WHERE

                DATE(b.booking_date)
                BETWEEN '$start_safe'
                AND '$end_safe'

                AND b.status != 'cancelled'

            GROUP BY

                b.booking_date,

                b.time_start,

                b.time_end

        ) booked

            ON booked.booking_date =
               ts.slot_date

            AND booked.time_start =
                ts.time_start

            AND booked.time_end =
                ts.time_end

        WHERE

            ts.slot_date
            BETWEEN '$start_safe'
            AND '$end_safe'
        "
    );


if ($result) {

    $row =
        $result->fetch_assoc();


    $configured_capacity =
        intval(
            $row['configured_capacity']
            ?? 0
        );


    $booked_slots =
        intval(
            $row['booked_slots']
            ?? 0
        );


    $capacity_analysis[
        'configured_capacity'
    ] =
        $configured_capacity;


    $capacity_analysis[
        'booked_slots'
    ] =
        $booked_slots;


    $capacity_analysis[
        'available_capacity'
    ] =
        max(
            0,
            $configured_capacity -
            $booked_slots
        );


    $capacity_analysis[
        'utilization_rate'
    ] =
        $configured_capacity > 0
        ? round(
            (
                $booked_slots /
                $configured_capacity
            ) * 100,
            1
        )
        : 0;


    $capacity_analysis[
        'full_slots'
    ] =
        intval(
            $row['full_slots']
            ?? 0
        );


    $capacity_analysis[
        'underutilized_slots'
    ] =
        intval(
            $row['underutilized_slots']
            ?? 0
        );

}


/* =========================================================
   EXCEPTION / MANAGEMENT ATTENTION
========================================================= */

$exceptions = [];


/* =========================================================
   HIGH CANCELLATION RATE
========================================================= */

if (
    $total_bookings > 0 &&
    $cancellation_rate >= 10
) {

    $exceptions[] = [

        'type' =>
            'warning',

        'code' =>
            'HIGH_CANCELLATION_RATE',

        'title' =>
            'High Cancellation Rate',

        'value' =>
            round(
                $cancellation_rate,
                1
            ),

        'message' =>
            'Cancellation rate is at or above 10% for the selected period.'

    ];

}


/* =========================================================
   PENDING PAYMENTS
========================================================= */

if (
    intval(
        $payments['pending_count']
        ?? 0
    ) > 0
) {

    $exceptions[] = [

        'type' =>
            'warning',

        'code' =>
            'PENDING_PAYMENTS',

        'title' =>
            'Pending Payments',

        'value' =>
            intval(
                $payments['pending_count']
            ),

        'message' =>
            'There are bookings with pending payment status.'

    ];

}


/* =========================================================
   FAILED PAYMENTS
========================================================= */

if (
    intval(
        $payments['failed_count']
        ?? 0
    ) > 0
) {

    $exceptions[] = [

        'type' =>
            'critical',

        'code' =>
            'FAILED_PAYMENTS',

        'title' =>
            'Failed Payments',

        'value' =>
            intval(
                $payments['failed_count']
            ),

        'message' =>
            'There are payment transactions marked as failed.'

    ];

}


/* =========================================================
   LOW COMPLETION RATE
========================================================= */

if (
    $total_bookings > 0 &&
    $completion_rate < 80
) {

    $exceptions[] = [

        'type' =>
            'warning',

        'code' =>
            'LOW_COMPLETION_RATE',

        'title' =>
            'Low Completion Rate',

        'value' =>
            round(
                $completion_rate,
                1
            ),

        'message' =>
            'Completion rate is below the 80% management threshold.'

    ];

}


/* =========================================================
   CAPACITY PRESSURE
========================================================= */

if (
    (
        $capacity_analysis[
            'utilization_rate'
        ] ?? 0
    ) >= 90
) {

    $exceptions[] = [

        'type' =>
            'warning',

        'code' =>
            'HIGH_CAPACITY_UTILIZATION',

        'title' =>
            'High Capacity Utilization',

        'value' =>
            $capacity_analysis[
                'utilization_rate'
            ],

        'message' =>
            'Configured booking capacity is heavily utilized.'

    ];

}


/* =========================================================
   LOW CUSTOMER RATING
========================================================= */

if (
    $average_rating > 0 &&
    $average_rating < 4
) {

    $exceptions[] = [

        'type' =>
            'warning',

        'code' =>
            'LOW_CUSTOMER_RATING',

        'title' =>
            'Low Customer Rating',

        'value' =>
            $average_rating,

        'message' =>
            'Average customer rating is below 4.0.'

    ];

}


/* =========================================================
   OUTSTANDING PAYMENT ALERT
========================================================= */

if (
    $outstanding_payment_amount > 0
) {

    $exceptions[] = [

        'type' =>
            'warning',

        'code' =>
            'OUTSTANDING_PAYMENTS',

        'title' =>
            'Outstanding Payments',

        'value' =>
            $outstanding_payment_amount,

        'message' =>
            'There are booking amounts that have not yet been fully collected.'

    ];

}


/* =========================================================
   ADVANCED KPI RESPONSE
========================================================= */

$advanced_kpis = [

    'report_days' =>
        intval(
            $report_days
        ),

    'cancellation_rate' =>
        round(
            $cancellation_rate,
            1
        ),

    'estimated_operating_margin' =>
        $estimated_operating_margin,

    'estimated_margin_rate' =>
        round(
            $estimated_margin_rate,
            1
        ),

    'outstanding_payment_amount' =>
        moneyValue(
            $outstanding_payment_amount
        ),

    'payment_collection_rate' =>
        round(
            $payment_collection_rate,
            1
        )

];


/* =========================================================
   PERIOD COMPARISON RESPONSE
========================================================= */

$period_comparison = [

    'previous_period' => [

        'start_date' =>
            $previous_start_date,

        'end_date' =>
            $previous_end_date,

        'total_bookings' =>
            $previous_total_bookings,

        'completed_jobs' =>
            $previous_completed_jobs,

        'cancelled_jobs' =>
            $previous_cancelled_jobs,

        'paid_revenue' =>
            $previous_paid_revenue,

        'average_rating' =>
            $previous_average_rating

    ],

    'change' => [

        'total_bookings' =>
            $calculateChange(
                $total_bookings,
                $previous_total_bookings
            ),

        'completed_jobs' =>
            $calculateChange(
                $completed_jobs,
                $previous_completed_jobs
            ),

        'cancelled_jobs' =>
            $calculateChange(
                $cancelled_jobs,
                $previous_cancelled_jobs
            ),

        'paid_revenue' =>
            $calculateChange(
                $paid_revenue,
                $previous_paid_revenue
            ),

        'average_rating' =>
            $calculateChange(
                $average_rating,
                $previous_average_rating
            )

    ]

];


/* =========================================================
   RESPONSE
========================================================= */

$response = [

    'success' =>
        true,


    /* =====================================================
       PERIOD
    ===================================================== */

    'period' => [

        'type' =>
            $period,

        'start_date' =>
            $start_date,

        'end_date' =>
            $end_date,

        'label' =>
            $period_label

    ],


    /* =====================================================
       SUMMARY
    ===================================================== */

    'summary' => [

        'total_bookings' =>
            $total_bookings,

        'completed_jobs' =>
            $completed_jobs,

        'pending_jobs' =>
            $pending_jobs,

        'cancelled_jobs' =>
            $cancelled_jobs,

        'paid_revenue' =>
            $paid_revenue,

        'labor_cost' =>
            $labor_cost,

        'net_profit' =>
            $net_profit,

        'completion_rate' =>
            round(
                $completion_rate,
                1
            ),

        'average_rating' =>
            $average_rating,

        'average_booking_value' =>
            $average_booking_value

    ],


    /* =====================================================
       PAYMENTS
    ===================================================== */

    'payments' =>
        $payments,


    /* =====================================================
       BOOKING STATUS
    ===================================================== */

    'booking_status' =>
        array_map(

            function ($value) {

                return [

                    'count' =>
                        intval(
                            $value
                        )

                ];

            },

            $status_counts

        ),


    /* =====================================================
       BOOKING TREND
    ===================================================== */

    'booking_trend' =>
        $booking_trend,


    /* =====================================================
       SERVICES
    ===================================================== */

    'services' =>
        $services,


    /* =====================================================
       TECHNICIANS
    ===================================================== */

    'technicians' =>
        $technicians,


    /* =====================================================
       CUSTOMERS
    ===================================================== */

    'customers' => [

        'total' =>
            $total_customers,

        'new_customers' =>
            $new_customers,

        'returning_customers' =>
            $returning_customers,

        'total_reviews' =>
            $total_reviews

    ],


    /* =====================================================
       COMPLETION REPORTS
    ===================================================== */

    'completion_reports' => [

        'total' =>
            $completion_reports,

        'replacement_cost' =>
            $replacement_cost,

        'replaced_parts_jobs' =>
            $replaced_parts_jobs

    ],


    /* =====================================================
       DETAILED RECORDS
    ===================================================== */

    'records' =>
        $records,


    /* =====================================================
       ADVANCED MANAGEMENT REPORTING V2
    ===================================================== */

    'advanced_kpis' =>
        $advanced_kpis,

    'period_comparison' =>
        $period_comparison,

    'capacity_analysis' =>
        $capacity_analysis,

    'exceptions' =>
        $exceptions

];


/* =========================================================
   SEND RESPONSE
========================================================= */

echo json_encode(
    $response,
    JSON_UNESCAPED_UNICODE
);


/* =========================================================
   CLOSE DATABASE
========================================================= */

$conn->close();

?>