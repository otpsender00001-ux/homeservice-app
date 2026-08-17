// =========================
// REAL-TIME SLOT EXPIRATION
// =========================

let slotRealtimeTimer = null;
let currentUserSelectedDate = null;

document.addEventListener('DOMContentLoaded', function() {

    // =========================
    // LOGOUT MODAL
    // =========================

    const logoutBtn = document.getElementById("logout-btn");
    const logoutModal = document.getElementById("logout-modal");

    const cancelLogout = document.getElementById("cancel-logout");
    const confirmLogout = document.getElementById("confirm-logout");

    if (logoutBtn && logoutModal) {

        logoutBtn.addEventListener("click", function(e) {
            e.preventDefault();

            console.log("Logout button clicked!");

            logoutModal.classList.add("show");
        });

        if (cancelLogout) {
            cancelLogout.addEventListener("click", function() {
                logoutModal.classList.remove("show");
            });
        }

        if (confirmLogout) {
            confirmLogout.addEventListener("click", function() {

                confirmLogout.disabled = true;

                if (cancelLogout) {
                    cancelLogout.disabled = true;
                }

                confirmLogout.innerHTML = `
                    <span class="spinner"></span>
                    Logging out...
                `;

                setTimeout(() => {
                    window.location.href = "../backend/auth/logout.php";
                }, 1200);

            });
        }

        // Close when clicking outside the modal
        logoutModal.addEventListener("click", function(e) {
            if (e.target === logoutModal) {
                logoutModal.classList.remove("show");
            }
        });
    }


    // =========================
    // YOUR EXISTING BOOKINGS JS
    // =========================

    const searchInput = document.getElementById('search-customer');
    const filterStatus = document.getElementById('filter-status');

    // Initial load
    fetchBookings();

    // Event listeners para sa Search at Filter
    if (searchInput) {
        searchInput.addEventListener('input', fetchBookings);
    }

    if (filterStatus) {
        filterStatus.addEventListener('change', fetchBookings);
    }


    // =========================
    // SLOT MANAGEMENT INITIALIZATION
    // =========================

    if (document.getElementById('slot-table-body')) {
        fetchAdminSlots();
    }


    // =========================
    // USER SIDE DATE PICKER
    // =========================

    const userDateInput = document.getElementById('booking-date');

    if (userDateInput) {

        userDateInput.addEventListener('change', function() {

            // Clear previous selected time
            const startInput =
                document.getElementById('selected-time-start');

            const endInput =
                document.getElementById('selected-time-end');

            if (startInput) {
                startInput.value = '';
            }

            if (endInput) {
                endInput.value = '';
            }

            fetchAvailableSlotsForUser(this.value);

        });

        // If date already has a value when page loads
        if (userDateInput.value) {
            fetchAvailableSlotsForUser(userDateInput.value);
        }
    }

});


// =====================================================
// ADD ADMIN TIME SLOT
// =====================================================

async function addSlot() {

    const startInput =
        document.getElementById('start-time');

    const endInput =
        document.getElementById('end-time');

    const capacityInput =
        document.getElementById('slot-capacity');

    if (!startInput || !endInput || !capacityInput) {

        console.error(
            'Time slot input elements not found.'
        );

        return;
    }

    const startTime = startInput.value;
    const endTime = endInput.value;
    const maxCapacity = capacityInput.value;

    // Validate required fields
    if (!startTime || !endTime || !maxCapacity) {

        alert(
            'Please complete all time slot fields.'
        );

        return;
    }

    // Make sure end time is later than start time
    if (startTime >= endTime) {

        alert(
            'End time must be later than start time.'
        );

        return;
    }

    // Validate capacity
    if (parseInt(maxCapacity) < 1) {

        alert(
            'Maximum customers must be at least 1.'
        );

        return;
    }

    try {

        const formData = new FormData();

        formData.append(
            'time_start',
            startTime
        );

        formData.append(
            'time_end',
            endTime
        );

        formData.append(
            'max_capacity',
            maxCapacity
        );

        const response = await fetch(
            '../backend/admin/save_slot.php',
            {
                method: 'POST',
                body: formData
            }
        );

        if (!response.ok) {

            throw new Error(
                `HTTP Error: ${response.status}`
            );
        }

        const result = await response.json();

        if (result.status === 'success') {

            alert(
                'Slot added successfully!'
            );

            // Clear inputs
            startInput.value = '';
            endInput.value = '';

            // Restore default capacity
            capacityInput.value = '5';

            // Refresh admin slot table
            await fetchAdminSlots();

        } else {

            alert(
                result.message ||
                'Failed to add time slot.'
            );
        }

    } catch (error) {

        console.error(
            'Add Slot Error:',
            error
        );

        alert(
            'Something went wrong while adding the time slot.'
        );
    }
}


// =====================================================
// REAL-TIME SLOT CHECKER
// =====================================================

function startSlotRealtimeChecker() {

    // Prevent duplicate timers
    if (slotRealtimeTimer) {

        clearInterval(
            slotRealtimeTimer
        );
    }

    // Check every second
    slotRealtimeTimer = setInterval(() => {

        if (!currentUserSelectedDate) {
            return;
        }

        const dateInput =
            document.getElementById(
                'booking-date'
            );

        if (!dateInput || !dateInput.value) {
            return;
        }

        updateSlotExpiration(
            dateInput.value
        );

    }, 1000);
}


// =====================================================
// UPDATE SLOT EXPIRATION
// =====================================================

function updateSlotExpiration(selectedDate) {

    const container =
        document.getElementById(
            'available-slots-container'
        );

    if (!container) {
        return;
    }

    const buttons =
        container.querySelectorAll(
            '.slot-btn'
        );

    if (!buttons.length) {
        return;
    }

    const now = new Date();

    // Current date
    const today =
        now.getFullYear() +
        '-' +
        String(
            now.getMonth() + 1
        ).padStart(2, '0') +
        '-' +
        String(
            now.getDate()
        ).padStart(2, '0');

    // Only expire slots for TODAY
    if (selectedDate !== today) {
        return;
    }

    // Current time in seconds
    const currentTimeInSeconds =
        (now.getHours() * 3600) +
        (now.getMinutes() * 60) +
        now.getSeconds();

    buttons.forEach(button => {

        const startTime =
            button.dataset.startTime;

        if (!startTime) {
            return;
        }

        const [
            hours,
            minutes,
            seconds = 0
        ] =
            startTime
                .split(':')
                .map(Number);

        const slotStartInSeconds =
            (hours * 3600) +
            (minutes * 60) +
            seconds;

        // Slot has started
        if (
            currentTimeInSeconds >=
            slotStartInSeconds
        ) {

            // Disable slot
            button.disabled = true;

            // Remove selected state
            button.classList.remove(
                'selected'
            );

            // Add full/expired state
            button.classList.add(
                'full'
            );

            // Change display
            button.innerHTML = `
                <strong>
                    ${button.dataset.displayTime}
                </strong>
                <br>
                <small>
                    TIME PASSED
                </small>
            `;

            // Clear selected time if this
            // was the selected slot
            const startInput =
                document.getElementById(
                    'selected-time-start'
                );

            const endInput =
                document.getElementById(
                    'selected-time-end'
                );

            if (
                startInput &&
                startInput.value === startTime
            ) {

                startInput.value = '';

                if (endInput) {
                    endInput.value = '';
                }
            }
        }
    });
}


// =====================================================
// FETCH BOOKINGS
// =====================================================

// =====================================================
// FETCH BOOKINGS - PROFESSIONAL CARD VIEW
// =====================================================

async function fetchBookings() {

    const searchInput =
        document.getElementById(
            'search-customer'
        );

    const filterStatus =
        document.getElementById(
            'filter-status'
        );

    const search =
        searchInput
            ? searchInput.value.trim()
            : '';

    const status =
        filterStatus
            ? filterStatus.value
            : 'all';

    const container =
        document.getElementById(
            'bookings-table-body'
        );

    if (!container) {
        return;
    }

    // Loading state
    container.innerHTML = `
        <div class="booking-loading">
            <div class="booking-loading-spinner"></div>
            <span>Loading bookings...</span>
        </div>
    `;

    try {

        const response = await fetch(
            `../backend/bookings/get_all_bookings.php?search=${encodeURIComponent(search)}&status=${encodeURIComponent(status)}`
        );

        if (!response.ok) {

            throw new Error(
                `HTTP Error: ${response.status}`
            );
        }

        const data =
            await response.json();

        /*
        |--------------------------------------------------------------------------
        | BACKEND ERROR
        |--------------------------------------------------------------------------
        */

        if (
            !Array.isArray(data)
        ) {

            console.error(
                'Booking API Error:',
                data
            );

            container.innerHTML = `
                <div class="booking-empty-state">
                    <div class="booking-empty-icon">⚠️</div>

                    <h3>
                        Unable to load bookings
                    </h3>

                    <p>
                        Something went wrong while retrieving booking information.
                    </p>
                </div>
            `;

            return;
        }

        /*
        |--------------------------------------------------------------------------
        | NO BOOKINGS
        |--------------------------------------------------------------------------
        */

        if (data.length === 0) {

            container.innerHTML = `
                <div class="booking-empty-state">

                    <div class="booking-empty-icon">
                        📅
                    </div>

                    <h3>
                        No bookings found
                    </h3>

                    <p>
                        There are no bookings matching your current search or filter.
                    </p>

                </div>
            `;

            return;
        }

        /*
        |--------------------------------------------------------------------------
        | CLEAR CONTAINER
        |--------------------------------------------------------------------------
        */

        container.innerHTML = '';

        /*
        |--------------------------------------------------------------------------
        | CREATE BOOKING CARDS
        |--------------------------------------------------------------------------
        */

        data.forEach(
            booking => {

                const status =
                    booking.status ||
                    'pending';

                const statusLabel =
                    formatBookingStatus(
                        status
                    );

                const statusClass =
                    getStatusClass(
                        status
                    );

                /*
                |--------------------------------------------------------------------------
                | TIME RANGE
                |--------------------------------------------------------------------------
                */

                const startTime =
                    formatTime(
                        booking.time_start
                    );

                const endTime =
                    formatTime(
                        booking.time_end
                    );

                let timeRange = 'N/A';

                if (
                    booking.time_start &&
                    booking.time_end
                ) {

                    timeRange =
                        `${startTime} – ${endTime}`;

                } else if (
                    booking.time_start
                ) {

                    timeRange =
                        startTime;
                }

                /*
                |--------------------------------------------------------------------------
                | CUSTOMER
                |--------------------------------------------------------------------------
                */

                const customerName =
                    booking.customer ||
                    'Unknown Customer';

                const customerInitial =
                    customerName
                        .charAt(0)
                        .toUpperCase();

                /*
                |--------------------------------------------------------------------------
                | ADDRESS
                |--------------------------------------------------------------------------
                */

                const address =
                    booking.address &&
                    booking.address.trim()
                        ? booking.address
                        : 'No service address provided';

                /*
                |--------------------------------------------------------------------------
                | PHONE
                |--------------------------------------------------------------------------
                */

                const phone =
                    booking.phone &&
                    booking.phone.trim()
                        ? booking.phone
                        : 'No phone number provided';

                /*
                |--------------------------------------------------------------------------
                | NOTES
                |--------------------------------------------------------------------------
                */

                const notes =
                    booking.notes &&
                    booking.notes.trim()
                        ? booking.notes
                        : 'No customer notes provided';

                /*
                |--------------------------------------------------------------------------
                | TECHNICIAN
                |--------------------------------------------------------------------------
                */

                const technician =
                    booking.technician &&
                    booking.technician.trim()
                        ? booking.technician
                        : 'Not Assigned';

                /*
                |--------------------------------------------------------------------------
                | AMOUNT
                |--------------------------------------------------------------------------
                */

                const totalAmount =
                    formatCurrency(
                        booking.total_amount
                    );

                const laborCost =
                    formatCurrency(
                        booking.labor_cost_amount
                    );

                /*
                |--------------------------------------------------------------------------
                | PAYMENT
                |--------------------------------------------------------------------------
                */

                const paymentMethod =
                    booking.payment_method
                        ? capitalizeWords(
                            booking.payment_method
                        )
                        : 'Not Available';

                const paymentStatus =
                    booking.payment_status
                        ? capitalizeWords(
                            booking.payment_status
                        )
                        : 'Not Available';

                const paymentStatusClass =
                    getPaymentStatusClass(
                        booking.payment_status
                    );

                /*
                |--------------------------------------------------------------------------
                | CANCELLATION
                |--------------------------------------------------------------------------
                */

                let cancellationHTML = '';

                if (
                    status === 'cancelled' &&
                    booking.cancellation_reason
                ) {

                    cancellationHTML = `
                        <div class="booking-detail-section cancellation-section">

                            <div class="booking-section-title">
                                <span class="section-icon">⚠️</span>
                                Cancellation Reason
                            </div>

                            <div class="cancellation-reason">
                                ${escapeHTML(
                                    booking.cancellation_reason
                                )}
                            </div>

                        </div>
                    `;
                }

                /*
                |--------------------------------------------------------------------------
                | ACTIONS
                |--------------------------------------------------------------------------
                */

                let actionHTML = '';

                if (
                    status === 'pending'
                ) {

                    actionHTML = `
                        <div class="booking-card-actions">

                            <button
                                type="button"
                                class="btn-accept booking-action-primary"
                                onclick="openAssignModal(
                                    ${Number(booking.id)},
                                    '${escapeJS(
                                        booking.service_name || ''
                                    )}'
                                )"
                            >
                                <span>✓</span>
                                Accept & Assign
                            </button>

                            <button
                                type="button"
                                class="btn-cancel-booking booking-action-danger"
                                onclick="openCancelModal(
                                    ${Number(booking.id)}
                                )"
                            >
                                <span>✕</span>
                                Cancel Booking
                            </button>

                        </div>
                    `;

                } else {

                    actionHTML = `
                        <div class="booking-processed">

                            <span class="processed-icon">
                                ✓
                            </span>

                            <span>
                                Booking Processed
                            </span>

                        </div>
                    `;
                }

                /*
                |--------------------------------------------------------------------------
                | CREATED DATE
                |--------------------------------------------------------------------------
                */

                const createdAt =
                    formatDateTime(
                        booking.created_at
                    );

                /*
                |--------------------------------------------------------------------------
                | CARD
                |--------------------------------------------------------------------------
                */

                const card = document.createElement(
                    'article'
                );

                card.className =
                    'booking-card';

                card.dataset.bookingId =
                    booking.id;

                card.innerHTML = `

                    <!-- =========================
                         CARD HEADER
                    ========================== -->

                    <div class="booking-card-header">

                        <div class="booking-card-heading">

                            <div class="booking-service-icon">
                                🔧
                            </div>

                            <div>

                                <div class="booking-id">
                                    Booking #${Number(
                                        booking.id
                                    )}
                                </div>

                                <h3 class="booking-service-name">
                                    ${escapeHTML(
                                        booking.service_name ||
                                        'Service Not Available'
                                    )}
                                </h3>

                                ${
                                    booking.service_category
                                        ? `
                                            <span class="booking-category">
                                                ${escapeHTML(
                                                    booking.service_category
                                                )}
                                            </span>
                                          `
                                        : ''
                                }

                            </div>

                        </div>

                        <span class="booking-status ${statusClass}">
                            ${statusLabel}
                        </span>

                    </div>


                    <!-- =========================
                         CUSTOMER
                    ========================== -->

                    <div class="booking-detail-section">

                        <div class="booking-section-title">
                            <span class="section-icon">👤</span>
                            Customer Information
                        </div>

                        <div class="customer-profile">

                            <div class="customer-avatar">
                                ${escapeHTML(
                                    customerInitial
                                )}
                            </div>

                            <div class="customer-main-info">

                                <strong>
                                    ${escapeHTML(
                                        customerName
                                    )}
                                </strong>

                                <span>
                                    Customer
                                </span>

                            </div>

                            <div class="customer-contact">

                                <a
                                    href="tel:${escapeHTML(
                                        phone
                                    )}"
                                    class="contact-item"
                                >
                                    <span>📞</span>
                                    ${escapeHTML(
                                        phone
                                    )}
                                </a>

                            </div>

                        </div>

                    </div>


                    <!-- =========================
                         SCHEDULE + ADDRESS
                    ========================== -->

                    <div class="booking-info-grid">

                        <div class="booking-info-box">

                            <div class="booking-info-label">
                                <span>📅</span>
                                DATE
                            </div>

                            <div class="booking-info-value">
                                ${formatDate(
                                    booking.booking_date
                                )}
                            </div>

                        </div>


                        <div class="booking-info-box booking-time-box">

                            <div class="booking-info-label">
                                <span>🕐</span>
                                TIME SLOT
                            </div>

                            <div class="booking-info-value">
                                ${escapeHTML(
                                    timeRange
                                )}
                            </div>

                        </div>


                        <div class="booking-info-box">

                            <div class="booking-info-label">
                                <span>👨‍🔧</span>
                                TECHNICIAN
                            </div>

                            <div class="booking-info-value ${
                                technician === 'Not Assigned'
                                    ? 'not-assigned'
                                    : ''
                            }">

                                ${escapeHTML(
                                    technician
                                )}

                            </div>

                        </div>

                    </div>


                    <!-- =========================
                         SERVICE ADDRESS
                    ========================== -->

                    <div class="booking-detail-section">

                        <div class="booking-section-title">
                            <span class="section-icon">📍</span>
                            Service Address
                        </div>

                        <div class="booking-address">
                            <span class="address-pin">
                                📍
                            </span>

                            <span>
                                ${escapeHTML(
                                    address
                                )}
                            </span>
                        </div>

                    </div>


                    <!-- =========================
                         CUSTOMER NOTES
                    ========================== -->

                    <div class="booking-detail-section">

                        <div class="booking-section-title">
                            <span class="section-icon">📝</span>
                            Customer Request / Notes
                        </div>

                        <div class="booking-notes">

                            ${escapeHTML(
                                notes
                            )}

                        </div>

                    </div>


                    <!-- =========================
                         FINANCIAL INFORMATION
                    ========================== -->

                    <div class="booking-financial-grid">

                        <div class="financial-item">

                            <span class="financial-label">
                                Total Amount
                            </span>

                            <strong class="financial-value">
                                ${totalAmount}
                            </strong>

                        </div>


                        <div class="financial-item">

                            <span class="financial-label">
                                Labor Cost
                            </span>

                            <strong class="financial-value">
                                ${laborCost}
                            </strong>

                        </div>


                        <div class="financial-item">

                            <span class="financial-label">
                                Payment Method
                            </span>

                            <strong class="financial-value">
                                ${escapeHTML(
                                    paymentMethod
                                )}
                            </strong>

                        </div>


                        <div class="financial-item">

                            <span class="financial-label">
                                Payment Status
                            </span>

                            <strong class="payment-status ${paymentStatusClass}">
                                ${escapeHTML(
                                    paymentStatus
                                )}
                            </strong>

                        </div>

                    </div>


                    <!-- =========================
                         BOOKING META
                    ========================== -->

                    <div class="booking-meta">

                        <span>
                            🕒 Requested:
                            ${escapeHTML(
                                createdAt
                            )}
                        </span>

                        ${
                            booking.transaction_ref
                                ? `
                                    <span>
                                        💳 Ref:
                                        ${escapeHTML(
                                            booking.transaction_ref
                                        )}
                                    </span>
                                  `
                                : ''
                        }

                    </div>


                    ${cancellationHTML}


                    <!-- =========================
                         ACTION AREA
                    ========================== -->

                    <div class="booking-card-footer">

                        ${actionHTML}

                    </div>

                `;

                container.appendChild(
                    card
                );
            }
        );

    } catch (error) {

        console.error(
            'Error fetching bookings:',
            error
        );

        container.innerHTML = `
            <div class="booking-empty-state error-state">

                <div class="booking-empty-icon">
                    ⚠️
                </div>

                <h3>
                    Unable to load bookings
                </h3>

                <p>
                    Something went wrong while loading the booking list.
                </p>

                <button
                    type="button"
                    class="booking-retry-btn"
                    onclick="fetchBookings()"
                >
                    Try Again
                </button>

            </div>
        `;
    }
}


// =====================================================
// BOOKING STATUS LABEL
// =====================================================

function formatBookingStatus(status) {

    if (!status) {
        return 'Unknown';
    }

    const labels = {

        pending:
            'Pending',

        accepted:
            'Accepted',

        in_progress:
            'In Progress',

        completed:
            'Completed',

        cancelled:
            'Cancelled'
    };

    return labels[status] ||
        capitalizeWords(status);
}


// =====================================================
// PAYMENT STATUS CLASS
// =====================================================

function getPaymentStatusClass(status) {

    const statusMap = {

        paid:
            'payment-paid',

        pending:
            'payment-pending',

        failed:
            'payment-failed'
    };

    return statusMap[status] || '';
}


// =====================================================
// FORMAT CURRENCY
// =====================================================

function formatCurrency(amount) {

    if (
        amount === null ||
        amount === undefined ||
        amount === ''
    ) {
        return '₱0.00';
    }

    const numericAmount =
        Number(amount);

    if (isNaN(numericAmount)) {
        return '₱0.00';
    }

    return '₱' +
        numericAmount.toLocaleString(
            'en-PH',
            {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }
        );
}


// =====================================================
// FORMAT DATE + TIME
// =====================================================

function formatDateTime(dateTime) {

    if (!dateTime) {
        return 'N/A';
    }

    const date =
        new Date(
            dateTime.replace(' ', 'T')
        );

    if (
        isNaN(
            date.getTime()
        )
    ) {
        return dateTime;
    }

    return date.toLocaleString(
        'en-US',
        {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        }
    );
}


// =====================================================
// CAPITALIZE WORDS
// =====================================================

function capitalizeWords(value) {

    if (!value) {
        return '';
    }

    return String(value)
        .replace(/_/g, ' ')
        .replace(/\b\w/g, char =>
            char.toUpperCase()
        );
}


// =====================================================
// ESCAPE HTML
// =====================================================

function escapeHTML(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return '';
    }

    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}


// =====================================================
// ESCAPE JAVASCRIPT STRING
// =====================================================

function escapeJS(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return '';
    }

    return String(value)
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/"/g, '\\"')
        .replace(/\r?\n/g, '\\n');
}

// =====================================================
// ASSIGN TECHNICIAN MODAL
// =====================================================

async function openAssignModal(
    bookingId,
    serviceName
) {

    document.getElementById(
        'modal-booking-id'
    ).value = bookingId;

    document.getElementById(
        'modal-service-name'
    ).innerText =
        "Service Needed: " +
        serviceName;

    document.getElementById(
        'tech-search-input'
    ).value = '';

    document.getElementById(
        'selected-tech-id'
    ).value = '';

    document.getElementById(
        'btn-confirm-assign'
    ).disabled = true;

    const listBox =
        document.getElementById(
            'tech-list-box'
        );

    listBox.innerHTML = `
        <div
            style="
                padding: 10px;
                color: gray;
                text-align: center;
                font-size: 13px;
            "
        >
            Searching available specialists...
        </div>
    `;

    try {

        const resp = await fetch(
            `../backend/bookings/get_available_techs.php?service=${encodeURIComponent(
                serviceName
            )}`
        );

        const techs =
            await resp.json();

        listBox.innerHTML = '';

        if (techs.length === 0) {

            listBox.innerHTML = `
                <div
                    style="
                        padding: 10px;
                        color: red;
                        text-align: center;
                        font-size: 13px;
                    "
                >
                    No specialists available for this service.
                </div>
            `;

        } else {

            techs.forEach(t => {

                const item =
                    document.createElement(
                        'div'
                    );

                item.className =
                    'tech-item';

                item.innerHTML = `
                    <span>
                        ${t.full_name}
                    </span>

                    <span
                        style="
                            font-size: 10px;
                            background:#ddd;
                            padding: 2px 5px;
                            border-radius: 4px;
                        "
                    >
                        Available
                    </span>
                `;

                item.onclick = function() {

                    document
                        .querySelectorAll(
                            '.tech-item'
                        )
                        .forEach(el =>
                            el.classList.remove(
                                'selected'
                            )
                        );

                    item.classList.add(
                        'selected'
                    );

                    document.getElementById(
                        'selected-tech-id'
                    ).value = t.id;

                    document.getElementById(
                        'btn-confirm-assign'
                    ).disabled = false;
                };

                listBox.appendChild(
                    item
                );
            });
        }

    } catch (error) {

        console.error(
            'Error fetching techs:',
            error
        );

        listBox.innerHTML = `
            <div
                style="
                    padding: 10px;
                    color: red;
                    text-align: center;
                    font-size: 13px;
                "
            >
                Error loading technicians
            </div>
        `;
    }

    document.getElementById(
        'assignModal'
    ).style.display = 'flex';
}


// =====================================================
// CLOSE ASSIGN MODAL
// =====================================================

function closeModal() {

    document.getElementById(
        'assignModal'
    ).style.display = 'none';
}


// =====================================================
// WINDOW CLICK
// =====================================================

window.onclick = function(event) {

    const assignModal =
        document.getElementById(
            'assignModal'
        );

    const cancelModal =
        document.getElementById(
            'cancelBookingModal'
        );

    if (
        event.target ===
        assignModal
    ) {
        closeModal();
    }

    if (
        event.target ===
        cancelModal
    ) {
        closeCancelModal();
    }
};


// =====================================================
// CANCEL BOOKING MODAL
// =====================================================

let cancelBookingId = null;


function openCancelModal(bookingId) {

    cancelBookingId = bookingId;

    const reasonInput =
        document.getElementById(
            'cancel-reason'
        );

    if (reasonInput) {
        reasonInput.value = '';
    }

    const yesButton =
        document.querySelector(
            '.btn-yes-cancel'
        );

    const noButton =
        document.querySelector(
            '.btn-no-cancel'
        );

    if (yesButton) {

        yesButton.disabled = false;

        yesButton.innerText =
            'Yes, Cancel';
    }

    if (noButton) {
        noButton.disabled = false;
    }

    document.getElementById(
        'cancelBookingModal'
    ).style.display = 'flex';
}


function closeCancelModal() {

    document.getElementById(
        'cancelBookingModal'
    ).style.display = 'none';

    const reasonInput =
        document.getElementById(
            'cancel-reason'
        );

    if (reasonInput) {
        reasonInput.value = '';
    }

    cancelBookingId = null;
}


// =====================================================
// CONFIRM CANCEL BOOKING
// =====================================================

async function confirmCancelBooking() {

    if (!cancelBookingId) {
        return;
    }

    const bookingId =
        cancelBookingId;

    const reasonInput =
        document.getElementById(
            'cancel-reason'
        );

    const reason =
        reasonInput
            ? reasonInput.value.trim()
            : '';

    // CHECK REASON
    if (!reason) {

        alert(
            "Please enter a reason for cancelling this booking."
        );

        if (reasonInput) {
            reasonInput.focus();
        }

        return;
    }

    // PREPARE FORM DATA
    const formData =
        new FormData();

    formData.append(
        'booking_id',
        bookingId
    );

    formData.append(
        'action',
        'cancel'
    );

    formData.append(
        'reason',
        reason
    );

    // DISABLE BUTTONS
    const yesButton =
        document.querySelector(
            '.btn-yes-cancel'
        );

    const noButton =
        document.querySelector(
            '.btn-no-cancel'
        );

    if (yesButton) {
        yesButton.disabled = true;
        yesButton.innerText =
            'Cancelling...';
    }

    if (noButton) {
        noButton.disabled = true;
    }

    // SEND TO BACKEND
    try {

        const resp = await fetch(
            '../backend/bookings/assign_technician.php',
            {
                method: 'POST',
                body: formData
            }
        );

        const res =
            await resp.json();

        if (res.success) {

            closeCancelModal();

            fetchBookings();

        } else {

            alert(
                res.message ||
                "Failed to cancel booking."
            );

            if (yesButton) {

                yesButton.disabled = false;

                yesButton.innerText =
                    'Yes, Cancel';
            }

            if (noButton) {
                noButton.disabled = false;
            }
        }

    } catch (error) {

        console.error(
            'Cancel Error:',
            error
        );

        alert(
            "Something went wrong while cancelling the booking."
        );

        if (yesButton) {

            yesButton.disabled = false;

            yesButton.innerText =
                'Yes, Cancel';
        }

        if (noButton) {
            noButton.disabled = false;
        }
    }
}


// =====================================================
// ASSIGN FORM
// =====================================================

const assignForm =
    document.getElementById(
        'assignForm'
    );

if (assignForm) {

    assignForm.onsubmit =
        async (e) => {

            e.preventDefault();

            const bookingId =
                document.getElementById(
                    'modal-booking-id'
                ).value;

            const techId =
                document.getElementById(
                    'selected-tech-id'
                ).value;

            if (!techId) {

                alert(
                    "Please select a technician from the list first."
                );

                return;
            }

            const formData =
                new FormData();

            formData.append(
                'booking_id',
                bookingId
            );

            formData.append(
                'technician_id',
                techId
            );

            formData.append(
                'action',
                'assign'
            );

            try {

                const resp =
                    await fetch(
                        '../backend/bookings/assign_technician.php',
                        {
                            method: 'POST',
                            body: formData
                        }
                    );

                const res =
                    await resp.json();

                if (res.success) {

                    closeModal();

                    fetchBookings();

                } else {

                    alert(
                        "Failed to assign technician. Please try again."
                    );
                }

            } catch (error) {

                console.error(
                    'Submit Error:',
                    error
                );
            }
        };
}


// =====================================================
// ADMIN SLOT MANAGEMENT
// =====================================================

async function fetchAdminSlots() {

    const tbody =
        document.getElementById(
            'slot-table-body'
        );

    if (!tbody) {
        return;
    }

    try {

        const response =
            await fetch(
                '../backend/admin/manage_slots_logic.php?action=fetch'
            );

        if (!response.ok) {

            throw new Error(
                `HTTP Error: ${response.status}`
            );
        }

        const slots =
            await response.json();

        console.log(
            'Admin Slots:',
            slots
        );

        tbody.innerHTML = '';

        if (
            !Array.isArray(slots) ||
            slots.length === 0
        ) {

            tbody.innerHTML = `
                <tr>
                    <td
                        colspan="3"
                        style="text-align:center;"
                    >
                        No time slots found.
                    </td>
                </tr>
            `;

            return;
        }

        slots.forEach(slot => {

            const row = `
                <tr>

                    <td>
                        <strong>
                            ${formatTime(
                                slot.time_start
                            )}

                            -

                            ${formatTime(
                                slot.time_end
                            )}
                        </strong>
                    </td>

                    <td>
                        ${slot.max_capacity}
                        Users
                    </td>

                    <td>

                        <button
                            class="btn-delete"
                            onclick="deleteSlot(
                                ${slot.id}
                            )"
                        >
                            Remove
                        </button>

                    </td>

                </tr>
            `;

            tbody.insertAdjacentHTML(
                'beforeend',
                row
            );
        });

    } catch (error) {

        console.error(
            'Slot Fetch Error:',
            error
        );

        tbody.innerHTML = `
            <tr>

                <td
                    colspan="3"
                    style="
                        text-align:center;
                        color:#ef4444;
                    "
                >
                    Failed to load time slots.
                </td>

            </tr>
        `;
    }
}


// =====================================================
// DELETE ADMIN TIME SLOT
// =====================================================

async function deleteSlot(slotId) {

    if (!slotId) {

        alert(
            'Invalid time slot.'
        );

        return;
    }

    const confirmed =
        confirm(
            'Are you sure you want to remove this time slot?'
        );

    if (!confirmed) {
        return;
    }

    try {

        const response =
            await fetch(
                `../backend/admin/manage_slots_logic.php?action=delete&id=${slotId}`
            );

        if (!response.ok) {

            throw new Error(
                `HTTP Error: ${response.status}`
            );
        }

        const result =
            await response.json();

        if (
            result.status ===
            'deleted'
        ) {

            await fetchAdminSlots();

        } else {

            alert(
                result.message ||
                'Failed to remove the time slot.'
            );
        }

    } catch (error) {

        console.error(
            'Delete Slot Error:',
            error
        );

        alert(
            'Something went wrong while removing the time slot.'
        );
    }
}


// =====================================================
// USER SIDE SLOT PICKER
// =====================================================

async function fetchAvailableSlotsForUser(
    date
) {

    const container =
        document.getElementById(
            'available-slots-container'
        );

    if (!container) {
        return;
    }

    // Save selected date
    currentUserSelectedDate =
        date;

    container.innerHTML =
        '<p>Checking availability...</p>';

    try {

        const response =
            await fetch(
                `../backend/bookings/get_time_slots.php?date=${date}`
            );

        const slots =
            await response.json();

        container.innerHTML = '';

        if (slots.length === 0) {

            container.innerHTML =
                '<p style="color:red;">Admin hasn\'t set any time slots yet.</p>';

            return;
        }

        slots.forEach(slot => {

            const isFull =
                !slot.available;

            const btn =
                document.createElement(
                    'button'
                );

            btn.type = 'button';

            btn.className =
                isFull
                    ? 'slot-btn full'
                    : 'slot-btn';

            btn.disabled =
                isFull;

            // Save slot data
            btn.dataset.startTime =
                slot.time_start;

            btn.dataset.endTime =
                slot.time_end;

            btn.dataset.displayTime =
                slot.display_time;

            btn.innerHTML = `
                <strong>
                    ${slot.display_time}
                </strong>

                <br>

                <small>
                    ${
                        isFull
                            ? 'FULL'
                            : slot.slots_left +
                              ' slots available'
                    }
                </small>
            `;


            // =================================================
            // SLOT CLICK
            // =================================================

            btn.onclick = function() {

                // Safety check
                const now =
                    new Date();

                const today =
                    now.getFullYear() +
                    '-' +
                    String(
                        now.getMonth() + 1
                    ).padStart(2, '0') +
                    '-' +
                    String(
                        now.getDate()
                    ).padStart(2, '0');

                if (date === today) {

                    const currentTimeInSeconds =
                        (now.getHours() * 3600) +
                        (now.getMinutes() * 60) +
                        now.getSeconds();

                    const [
                        hours,
                        minutes,
                        seconds = 0
                    ] =
                        slot.time_start
                            .split(':')
                            .map(Number);

                    const slotStartInSeconds =
                        (hours * 3600) +
                        (minutes * 60) +
                        seconds;

                    // Slot already started
                    if (
                        currentTimeInSeconds >=
                        slotStartInSeconds
                    ) {

                        btn.disabled =
                            true;

                        btn.classList.remove(
                            'selected'
                        );

                        btn.classList.add(
                            'full'
                        );

                        btn.innerHTML = `
                            <strong>
                                ${slot.display_time}
                            </strong>

                            <br>

                            <small>
                                TIME PASSED
                            </small>
                        `;

                        return;
                    }
                }


                // =========================
                // SELECT SLOT
                // =========================

                const startInput =
                    document.getElementById(
                        'selected-time-start'
                    );

                const endInput =
                    document.getElementById(
                        'selected-time-end'
                    );

                if (startInput) {

                    startInput.value =
                        slot.time_start;
                }

                if (endInput) {

                    endInput.value =
                        slot.time_end;
                }

                document
                    .querySelectorAll(
                        '.slot-btn'
                    )
                    .forEach(b =>
                        b.classList.remove(
                            'selected'
                        )
                    );

                btn.classList.add(
                    'selected'
                );
            };

            container.appendChild(
                btn
            );
        });


        // =================================================
        // START REAL-TIME CHECKER
        // =================================================

        startSlotRealtimeChecker();


        // =================================================
        // CHECK IMMEDIATELY
        // =================================================

        updateSlotExpiration(
            date
        );

    } catch (error) {

        console.error(
            'Error fetching user slots:',
            error
        );

        container.innerHTML =
            '<p>Error loading slots.</p>';
    }
}


// =====================================================
// HELPER FUNCTIONS
// =====================================================

function getStatusClass(status) {

    const statusMap = {

        'pending':
            'badge-orange',

        'completed':
            'badge-green',

        'cancelled':
            'badge-red',

        'in_progress':
            'badge-blue',

        'accepted':
            'badge-blue'
    };

    return statusMap[status] || '';
}


function formatDate(dateStr) {

    return new Date(
        dateStr
    ).toLocaleDateString(
        'en-US',
        {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        }
    );
}


function formatTime(timeStr) {

    if (!timeStr) {
        return 'N/A';
    }

    const [
        hours,
        minutes
    ] =
        timeStr.split(':');

    const h =
        parseInt(hours);

    const ampm =
        h >= 12
            ? 'PM'
            : 'AM';

    const formattedHours =
        h % 12 || 12;

    return `
        ${formattedHours}:${minutes}
        ${ampm}
    `;
}


function capitalize(str) {

    if (!str) {
        return '';
    }

    return (
        str.charAt(0).toUpperCase() +
        str.slice(1)
            .replace('_', ' ')
    );
}