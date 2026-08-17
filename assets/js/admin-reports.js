/* =========================================================
   SERVIQUICK ADMIN REPORTS
========================================================= */

let currentPeriod = "daily";

let currentReport = null;


/* =========================================================
   INITIALIZATION
========================================================= */

document.addEventListener("DOMContentLoaded", function () {

    initializeDates();

    setupPeriodTabs();

    setupButtons();

    setupLogout();

    loadReport();

});


/* =========================================================
   INITIAL DATES
========================================================= */

function initializeDates() {

    const today = new Date();

    const todayString =
        today.toISOString().split("T")[0];

    const monthString =
        todayString.substring(0, 7);

    const yearString =
        today.getFullYear();


    const daily =
        document.getElementById("daily-date");

    const monthly =
        document.getElementById("monthly-date");

    const yearly =
        document.getElementById("yearly-date");

    const customStart =
        document.getElementById("custom-start");

    const customEnd =
        document.getElementById("custom-end");


    if (daily) {
        daily.value = todayString;
    }

    if (monthly) {
        monthly.value = monthString;
    }

    if (yearly) {
        yearly.value = yearString;
    }

    if (customStart) {
        customStart.value = todayString;
    }

    if (customEnd) {
        customEnd.value = todayString;
    }

}


/* =========================================================
   PERIOD TABS
========================================================= */

function setupPeriodTabs() {

    const tabs =
        document.querySelectorAll(".period-tab");


    tabs.forEach(tab => {

        tab.addEventListener("click", function () {

            tabs.forEach(item => {
                item.classList.remove("active");
            });

            this.classList.add("active");

            currentPeriod =
                this.dataset.period;

            showPeriodInput();

            updatePeriodLabel();

        });

    });

}


/* =========================================================
   SHOW INPUT
========================================================= */

function showPeriodInput() {

    const daily =
        document.getElementById("daily-filter");

    const monthly =
        document.getElementById("monthly-filter");

    const yearly =
        document.getElementById("yearly-filter");

    const custom =
        document.getElementById("custom-filter");


    if (daily) daily.style.display = "none";
    if (monthly) monthly.style.display = "none";
    if (yearly) yearly.style.display = "none";
    if (custom) custom.style.display = "none";


    if (currentPeriod === "daily") {

        daily.style.display = "flex";

    }

    else if (currentPeriod === "monthly") {

        monthly.style.display = "flex";

    }

    else if (currentPeriod === "yearly") {

        yearly.style.display = "flex";

    }

    else if (currentPeriod === "custom") {

        custom.style.display = "grid";

    }

}


/* =========================================================
   BUTTONS
========================================================= */

function setupButtons() {

    const applyBtn =
        document.getElementById("apply-report-btn");

    const resetBtn =
        document.getElementById("reset-report-btn");

    const printBtn =
        document.getElementById("print-report-btn");


    if (applyBtn) {

        applyBtn.addEventListener(
            "click",
            loadReport
        );

    }


    if (resetBtn) {

        resetBtn.addEventListener(
            "click",
            resetReport
        );

    }


    if (printBtn) {

        printBtn.addEventListener(
            "click",
            openPrintConfirmation
        );

    }


    const cancelPrint =
        document.getElementById("cancel-print");

    const confirmPrint =
        document.getElementById("confirm-print");


    if (cancelPrint) {

        cancelPrint.addEventListener(
            "click",
            closePrintConfirmation
        );

    }


    if (confirmPrint) {

        confirmPrint.addEventListener(
            "click",
            executePrint
        );

    }

}


/* =========================================================
   LOAD REPORT
========================================================= */

async function loadReport() {

    const loading =
        document.getElementById("report-loading");

    const error =
        document.getElementById("report-error");


    if (loading) {
        loading.classList.add("show");
    }

    if (error) {
        error.style.display = "none";
    }


    try {

        const params =
            buildReportParameters();


        const response =
            await fetch(
                "../backend/admin/reports/get_report_data.php?" +
                params.toString()
            );


        if (!response.ok) {
            throw new Error(
                "HTTP " + response.status
            );
        }


        const data =
            await response.json();


        if (!data.success) {

            throw new Error(
                data.message ||
                "Report generation failed."
            );

        }


        currentReport = data;

        renderReport(data);

    }

    catch (err) {

        console.error(
            "Report loading error:",
            err
        );

        if (error) {

            error.textContent =
                err.message ||
                "Unable to load report.";

            error.style.display = "block";

        }

    }

    finally {

        if (loading) {
            loading.classList.remove("show");
        }

    }

}


/* =========================================================
   BUILD PARAMETERS
========================================================= */

function buildReportParameters() {

    const params =
        new URLSearchParams();


    params.set(
        "period",
        currentPeriod
    );


    if (currentPeriod === "daily") {

        params.set(
            "date",
            document.getElementById(
                "daily-date"
            ).value
        );

    }

    else if (currentPeriod === "monthly") {

        params.set(
            "month",
            document.getElementById(
                "monthly-date"
            ).value
        );

    }

    else if (currentPeriod === "yearly") {

        params.set(
            "year",
            document.getElementById(
                "yearly-date"
            ).value
        );

    }

    else if (currentPeriod === "custom") {

        params.set(
            "start_date",
            document.getElementById(
                "custom-start"
            ).value
        );

        params.set(
            "end_date",
            document.getElementById(
                "custom-end"
            ).value
        );

    }


    return params;

}


/* =========================================================
   RENDER REPORT
========================================================= */

function renderReport(data) {

    updatePeriodLabel(
        data.period.label
    );


    const s =
        data.summary;


    setText(
        "total-bookings",
        formatNumber(s.total_bookings)
    );

    setText(
        "completed-jobs",
        formatNumber(s.completed_jobs)
    );

    setText(
        "pending-jobs",
        formatNumber(s.pending_jobs)
    );

    setText(
        "cancelled-jobs",
        formatNumber(s.cancelled_jobs)
    );

    setText(
        "paid-revenue",
        formatMoney(s.paid_revenue)
    );

    setText(
        "completion-rate",
        formatPercent(s.completion_rate)
    );

    setText(
        "labor-cost",
        formatMoney(s.labor_cost)
    );

    setText(
        "average-rating",
        Number(s.average_rating || 0)
            .toFixed(1) + " / 5"
    );


    setText(
        "financial-revenue",
        formatMoney(s.paid_revenue)
    );

    setText(
        "financial-labor",
        formatMoney(s.labor_cost)
    );

    setText(
        "financial-profit",
        formatMoney(s.net_profit)
    );

    setText(
        "average-booking",
        formatMoney(s.average_booking_value)
    );


    setText(
        "cash-total",
        formatMoney(
            data.payments.cash
        )
    );

    setText(
        "gcash-total",
        formatMoney(
            data.payments.gcash
        )
    );

    setText(
        "card-total",
        formatMoney(
            data.payments.card
        )
    );

    setText(
        "pending-payments",
        formatNumber(
            data.payments.pending_count
        )
    );

    setText(
        "failed-payments",
        formatNumber(
            data.payments.failed_count
        )
    );


    setText(
        "total-customers",
        formatNumber(
            data.customers.total
        )
    );

    setText(
        "new-customers",
        formatNumber(
            data.customers.new_customers
        )
    );

    setText(
        "returning-customers",
        formatNumber(
            data.customers.returning_customers
        )
    );

    setText(
        "total-reviews",
        formatNumber(
            data.customers.total_reviews
        )
    );


    setText(
        "completion-reports",
        formatNumber(
            data.completion_reports.total
        )
    );

    setText(
        "replacement-cost",
        formatMoney(
            data.completion_reports.replacement_cost
        )
    );

    setText(
        "replaced-parts-jobs",
        formatNumber(
            data.completion_reports.replaced_parts_jobs
        )
    );


    renderStatusChart(
        data.booking_status
    );

    renderBookingTrend(
        data.booking_trend
    );

    renderServices(
        data.services
    );

    renderTechnicians(
        data.technicians
    );

    renderDetailedRecords(
        data.records
    );

}


/* =========================================================
   STATUS CHART
========================================================= */

function renderStatusChart(statuses) {

    const container =
        document.getElementById(
            "booking-status-chart"
        );


    if (!container) return;


    const values =
        Object.values(statuses || {});


    const max =
        Math.max(
            ...values.map(
                item => Number(item.count || 0)
            ),
            1
        );


    if (!values.length) {

        container.innerHTML =
            '<div class="empty-chart">No booking data.</div>';

        return;

    }


    container.innerHTML = "";


    Object.entries(statuses).forEach(
        ([status, item]) => {

            const count =
                Number(item.count || 0);

            const percent =
                (count / max) * 100;


            const row =
                document.createElement("div");

            row.className =
                "status-row";


            row.innerHTML = `
                <span class="status-name">
                    ${escapeHtml(
                        formatStatus(status)
                    )}
                </span>

                <div class="status-track">
                    <div
                        class="status-fill"
                        style="width:${percent}%"
                    ></div>
                </div>

                <span class="status-value">
                    ${count.toLocaleString()}
                </span>
            `;


            container.appendChild(row);

        }
    );

}


/* =========================================================
   BOOKING TREND
========================================================= */

function renderBookingTrend(trend) {

    const container =
        document.getElementById(
            "booking-trend"
        );


    if (!container) return;


    if (!trend || !trend.length) {

        container.innerHTML =
            '<div class="empty-chart">No booking activity.</div>';

        return;

    }


    container.innerHTML = "";


    trend.slice(-12).forEach(item => {

        const row =
            document.createElement("div");

        row.className =
            "trend-row";


        row.innerHTML = `
            <span>
                ${escapeHtml(item.label)}
            </span>

            <strong>
                ${Number(item.count).toLocaleString()}
                bookings
            </strong>
        `;


        container.appendChild(row);

    });

}


/* =========================================================
   SERVICES
========================================================= */

function renderServices(services) {

    const body =
        document.getElementById(
            "service-performance-body"
        );


    if (!body) return;


    if (!services || !services.length) {

        body.innerHTML =
            `<tr>
                <td colspan="5">
                    No service records found.
                </td>
            </tr>`;

        return;

    }


    body.innerHTML = "";


    services.forEach(service => {

        body.innerHTML += `
            <tr>

                <td>
                    <strong>
                        ${escapeHtml(
                            service.service_name ||
                            "Unknown"
                        )}
                    </strong>
                </td>

                <td>
                    ${formatNumber(
                        service.bookings
                    )}
                </td>

                <td>
                    ${formatNumber(
                        service.completed
                    )}
                </td>

                <td>
                    ${formatMoney(
                        service.revenue
                    )}
                </td>

                <td>
                    ★ ${Number(
                        service.average_rating || 0
                    ).toFixed(1)}
                </td>

            </tr>
        `;

    });

}


/* =========================================================
   TECHNICIANS
========================================================= */

function renderTechnicians(technicians) {

    const body =
        document.getElementById(
            "technician-performance-body"
        );


    if (!body) return;


    if (!technicians || !technicians.length) {

        body.innerHTML =
            `<tr>
                <td colspan="6">
                    No technician records found.
                </td>
            </tr>`;

        return;

    }


    body.innerHTML = "";


    technicians.forEach(tech => {

        body.innerHTML += `
            <tr>

                <td>
                    <strong>
                        ${escapeHtml(
                            tech.full_name ||
                            "Unknown"
                        )}
                    </strong>
                </td>

                <td>
                    ${formatNumber(
                        tech.assigned
                    )}
                </td>

                <td>
                    ${formatNumber(
                        tech.completed
                    )}
                </td>

                <td>
                    ${formatPercent(
                        tech.completion_rate
                    )}
                </td>

                <td>
                    ★ ${Number(
                        tech.average_rating || 0
                    ).toFixed(1)}
                </td>

                <td>
                    ${formatMoney(
                        tech.labor_cost
                    )}
                </td>

            </tr>
        `;

    });

}


/* =========================================================
   DETAILED RECORDS
========================================================= */

function renderDetailedRecords(records) {

    const body =
        document.getElementById(
            "detailed-records-body"
        );


    const count =
        document.getElementById(
            "records-count"
        );


    if (!body) return;


    if (count) {

        count.textContent =
            `${records.length.toLocaleString()} records`;

    }


    if (!records.length) {

        body.innerHTML =
            `<tr>
                <td colspan="8">
                    No booking records found for this period.
                </td>
            </tr>`;

        return;

    }


    body.innerHTML = "";


    records.forEach(record => {

        body.innerHTML += `
            <tr>

                <td>
                    #${escapeHtml(
                        String(record.id)
                    )}
                </td>

                <td>
                    ${formatDate(
                        record.booking_date
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        record.customer_name ||
                        "N/A"
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        record.service_name ||
                        "Deleted Service"
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        record.technician_name ||
                        "Unassigned"
                    )}
                </td>

                <td>
                    ${formatMoney(
                        record.total_amount
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        capitalize(
                            record.payment_status ||
                            "unpaid"
                        )
                    )}
                </td>

                <td>
                    <span class="status-badge ${getStatusClass(record.status)}">
                        ${escapeHtml(
                            formatStatus(record.status)
                        )}
                    </span>
                </td>

            </tr>
        `;

    });

}


/* =========================================================
   PERIOD LABEL
========================================================= */

function updatePeriodLabel(label = null) {

    const element =
        document.getElementById(
            "report-period-label"
        );


    if (!element) return;


    if (label) {

        element.textContent = label;

        return;

    }


    let text = "Today";


    if (currentPeriod === "monthly") {
        text = "Monthly Report";
    }

    else if (currentPeriod === "yearly") {
        text = "Yearly Report";
    }

    else if (currentPeriod === "custom") {
        text = "Custom Date Range";
    }


    element.textContent = text;

}


/* =========================================================
   RESET
========================================================= */

function resetReport() {

    currentPeriod = "daily";


    document.querySelectorAll(
        ".period-tab"
    ).forEach(tab => {

        tab.classList.remove("active");

        if (
            tab.dataset.period === "daily"
        ) {
            tab.classList.add("active");
        }

    });


    initializeDates();

    showPeriodInput();

    updatePeriodLabel();

    loadReport();

}


/* =========================================================
   PRINT CONFIRMATION
========================================================= */

function openPrintConfirmation() {

    if (!currentReport) {

        alert(
            "Please generate a report first."
        );

        return;

    }


    const modal =
        document.getElementById(
            "print-confirm-modal"
        );


    const message =
        document.getElementById(
            "print-confirm-message"
        );


    if (message) {

        message.textContent =
            `This will print the ${currentReport.period.label}. `
            +
            `Only the records included in the current report filter will be printed.`;

    }


    if (modal) {

        modal.classList.add("show");

    }

}


function closePrintConfirmation() {

    const modal =
        document.getElementById(
            "print-confirm-modal"
        );


    if (modal) {

        modal.classList.remove("show");

    }

}


/* =========================================================
   PRINT
========================================================= */

function executePrint() {

    closePrintConfirmation();


    setTimeout(() => {

        window.print();

    }, 200);

}


/* =========================================================
   LOGOUT
========================================================= */

function setupLogout() {

    const logoutBtn =
        document.getElementById(
            "logout-btn"
        );

    const modal =
        document.getElementById(
            "logout-modal"
        );

    const cancel =
        document.getElementById(
            "cancel-logout"
        );

    const confirm =
        document.getElementById(
            "confirm-logout"
        );


    if (logoutBtn) {

        logoutBtn.addEventListener(
            "click",
            function (e) {

                e.preventDefault();

                if (modal) {
                    modal.classList.add("show");
                }

            }
        );

    }


    if (cancel) {

        cancel.addEventListener(
            "click",
            function () {

                if (modal) {
                    modal.classList.remove("show");
                }

            }
        );

    }


    if (confirm) {

        confirm.addEventListener(
            "click",
            function () {

                window.location.href =
                    "../backend/auth/logout.php";

            }
        );

    }

}


/* =========================================================
   HELPERS
========================================================= */

function setText(id, value) {

    const element =
        document.getElementById(id);


    if (element) {
        element.textContent = value;
    }

}


function formatMoney(value) {

    const amount =
        Number(value || 0);


    return "₱" +
        amount.toLocaleString(
            "en-PH",
            {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }
        );

}


function formatNumber(value) {

    return Number(
        value || 0
    ).toLocaleString();

}


function formatPercent(value) {

    return Number(
        value || 0
    ).toFixed(1) + "%";

}


function formatDate(value) {

    if (!value) return "N/A";


    const date =
        new Date(
            value + "T00:00:00"
        );


    return date.toLocaleDateString(
        "en-PH",
        {
            month: "short",
            day: "numeric",
            year: "numeric"
        }
    );

}


function formatStatus(value) {

    if (!value) return "Unknown";


    return value
        .replace(/_/g, " ")
        .replace(
            /\b\w/g,
            char => char.toUpperCase()
        );

}


function capitalize(value) {

    return formatStatus(value);

}


function getStatusClass(status) {

    if (!status) {
        return "status-neutral";
    }


    switch (
        status.toLowerCase()
    ) {

        case "completed":
            return "status-completed";

        case "pending":
            return "status-pending";

        case "cancelled":
            return "status-cancelled";

        case "in_progress":
            return "status-progress";

        default:
            return "status-neutral";

    }

}


function escapeHtml(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}