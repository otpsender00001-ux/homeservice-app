let chatInterval = null;
let cancelBookingId = null;
let currentChatBookingId = null;
let lastMessageCount = 0;

document.addEventListener('DOMContentLoaded', () => {

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

        cancelLogout.addEventListener("click", function() {
            logoutModal.classList.remove("show");
        });

        confirmLogout.addEventListener("click", function() {

            confirmLogout.disabled = true;
            cancelLogout.disabled = true;

            confirmLogout.innerHTML = `
                <span class="spinner"></span>
                Logging out...
            `;

            setTimeout(() => {
                window.location.href = "../backend/auth/logout.php";
            }, 1200);

        });

        logoutModal.addEventListener("click", function(e) {
            if (e.target === logoutModal) {
                logoutModal.classList.remove("show");
            }
        });
    }

    loadBookings();

    // Search function logic
    const searchInput = document.getElementById('search-service');

    if (searchInput) {
        searchInput.addEventListener('input', function(e) {

            const term = e.target.value.toLowerCase();

            const cards = document.querySelectorAll('.booking-card');

            cards.forEach(card => {

                const title = card.querySelector('.booking-service-title h3');

                const text = title
                    ? title.innerText.toLowerCase()
                    : card.innerText.toLowerCase();

                card.style.display = text.includes(term) ? '' : 'none';
            });
        });
    }

    // Filter by status
    const filterStatus = document.getElementById('filter-status');

    if (filterStatus) {
        filterStatus.addEventListener('change', loadBookings);
    }
});


/* =========================================================
   HELPER FUNCTIONS
========================================================= */

function escapeHTML(value) {

    if (value === null || value === undefined) {
        return '';
    }

    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}


function formatDate(dateString) {

    if (!dateString) {
        return 'Not Available';
    }

    const date = new Date(dateString + 'T00:00:00');

    if (isNaN(date.getTime())) {
        return escapeHTML(dateString);
    }

    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}


function formatTime(timeString) {

    if (!timeString) {
        return 'Not Available';
    }

    const parts = String(timeString).split(':');

    if (parts.length < 2) {
        return escapeHTML(timeString);
    }

    let hour = parseInt(parts[0], 10);
    const minute = parts[1];

    if (isNaN(hour)) {
        return escapeHTML(timeString);
    }

    const ampm = hour >= 12 ? 'PM' : 'AM';

    hour = hour % 12;

    if (hour === 0) {
        hour = 12;
    }

    return `${hour}:${minute} ${ampm}`;
}


function formatTimeRange(start, end) {

    if (!start && !end) {
        return 'Not Available';
    }

    if (start && end) {
        return `${formatTime(start)} – ${formatTime(end)}`;
    }

    if (start) {
        return formatTime(start);
    }

    return formatTime(end);
}


function formatCurrency(amount) {

    if (
        amount === null ||
        amount === undefined ||
        amount === '' ||
        isNaN(Number(amount))
    ) {
        return '₱0.00';
    }

    return '₱' + Number(amount).toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}


function formatPaymentMethod(method) {

    if (!method) {
        return 'Not Available';
    }

    const methods = {
        cash: 'Cash',
        gcash: 'GCash',
        card: 'Card'
    };

    return methods[method.toLowerCase()] || method;
}


function formatPaymentStatus(status) {

    if (!status) {
        return {
            text: 'Not Available',
            className: 'unavailable'
        };
    }

    const statuses = {
        pending: {
            text: 'Pending',
            className: 'pending'
        },

        paid: {
            text: 'Paid',
            className: 'paid'
        },

        failed: {
            text: 'Failed',
            className: 'failed'
        }
    };

    return statuses[status.toLowerCase()] || {
        text: status,
        className: 'unavailable'
    };
}


function formatRequestedDate(dateTime) {

    if (!dateTime) {
        return 'Not Available';
    }

    const date = new Date(
        String(dateTime).replace(' ', 'T')
    );

    if (isNaN(date.getTime())) {
        return escapeHTML(dateTime);
    }

    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });
}


/* =========================================================
   LOAD USER BOOKINGS
========================================================= */

async function loadBookings() {

    const container = document.getElementById('booking-list');

    const statusSelect = document.getElementById('filter-status');

    const status = statusSelect
        ? statusSelect.value
        : 'all';

    container.innerHTML = `
        <div style="text-align:center; padding:40px; color:#999;">
            Loading your bookings...
        </div>
    `;

    try {

        const response = await fetch(
            `../backend/bookings/get_user_bookings.php?status=${encodeURIComponent(status)}`
        );

        if (!response.ok) {
            throw new Error(`HTTP Error! Status: ${response.status}`);
        }

        const data = await response.json();

        if (data.error) {

            container.innerHTML = `
                <div style="text-align:center; padding:30px;">
                    <p style="color:red;">
                        Database Error: ${escapeHTML(data.error)}
                    </p>
                </div>
            `;

            return;
        }

        if (!data || data.length === 0) {

            container.innerHTML = `
                <div class="booking-empty">

                    <div class="booking-empty-icon">
                        📅
                    </div>

                    <div class="booking-empty-title">
                        No bookings found
                    </div>

                    <div>
                        No ${status !== 'all' ? escapeHTML(status.replace('_', ' ')) : ''}
                        bookings found.
                    </div>

                </div>
            `;

            return;
        }

        container.innerHTML = '';

        data.forEach(b => {

            const statusClass = escapeHTML(
                b.status || 'pending'
            );

            const statusText = escapeHTML(
                (b.status || 'pending').replace('_', ' ')
            );

            /*
            |--------------------------------------------------------------------------
            | TECHNICIAN DISPLAY
            |--------------------------------------------------------------------------
            */

            let techDisplayName = '';

            if (b.tech_name) {

                techDisplayName = escapeHTML(
                    b.tech_name
                );

            } else if (b.status === 'cancelled') {

                techDisplayName = `
                    <span style="color:#dc3545;">
                        None (Cancelled)
                    </span>
                `;

            } else {

                techDisplayName = `
                    <span style="color:#999;">
                        Assigning...
                    </span>
                `;
            }


            /*
            |--------------------------------------------------------------------------
            | PAYMENT
            |--------------------------------------------------------------------------
            */

            const paymentMethod = formatPaymentMethod(
                b.payment_method
            );

            const paymentStatus = formatPaymentStatus(
                b.payment_status
            );


            /*
            |--------------------------------------------------------------------------
            | NOTES
            |--------------------------------------------------------------------------
            */

            let notesHTML = '';

            if (b.notes && String(b.notes).trim() !== '') {

                notesHTML = `
                    <div class="booking-notes">
                        ${escapeHTML(b.notes)}
                    </div>
                `;

            } else {

                notesHTML = `
                    <div class="booking-notes booking-no-notes">
                        No customer notes provided
                    </div>
                `;
            }


            /*
            |--------------------------------------------------------------------------
            | ADDRESS
            |--------------------------------------------------------------------------
            */

            const addressHTML = b.address
                ? escapeHTML(b.address)
                : 'Service address not available';


            /*
            |--------------------------------------------------------------------------
            | ACTION BUTTONS
            |--------------------------------------------------------------------------
            */

            let actionButton = '';
            let chatBtn = '';
            let cancelBtn = '';

            /*
            | Chat
            */

            if (
                b.status === 'accepted' ||
                b.status === 'in_progress'
            ) {

                chatBtn = `
                    <button
                        onclick="openChatModal(
                            ${Number(b.id)},
                            '${escapeHTML(b.tech_name || 'Technician')}'
                        )"
                        class="btn-chat">

                        💬 Chat Tech

                    </button>
                `;
            }


            /*
            | Cancel
            */

            if (
                b.status === 'pending' ||
                b.status === 'accepted'
            ) {

                cancelBtn = `
                    <button
                        onclick="openCancelModal(${Number(b.id)})"
                        class="btn-cancel">

                        ❌ Cancel Booking

                    </button>
                `;
            }


            /*
            |--------------------------------------------------------------------------
            | STATUS-SPECIFIC ACTIONS
            |--------------------------------------------------------------------------
            */

            if (b.status === 'in_progress') {

                actionButton = `
                    ${chatBtn}

                    <a
                        href="user-track-tech.html?id=${encodeURIComponent(b.id)}"
                        class="btn-track">

                        📍 Track Tech

                    </a>
                `;

            } else if (b.status === 'accepted') {

                actionButton = `
                    ${chatBtn}
                    ${cancelBtn}
                `;

            } else if (b.status === 'pending') {

                actionButton = cancelBtn;

            } else if (b.status === 'completed') {

                if (Number(b.is_rated) === 0) {

                    actionButton = `
                        <button
                            onclick="openRateModal(
                                ${Number(b.id)},
                                '${escapeHTML(b.tech_name || 'Technician')}'
                            )"
                            class="btn-rate">

                            ⭐ Rate Now

                        </button>
                    `;

                } else {

                    const rating = Number(b.user_rating) || 0;

                    const starIcons = '⭐'.repeat(
                        Math.min(Math.max(rating, 0), 5)
                    );

                    actionButton = `
                        <span class="rated-display">
                            ${starIcons} Rated
                        </span>
                    `;
                }
            }


            /*
            |--------------------------------------------------------------------------
            | BOOKING CARD
            |--------------------------------------------------------------------------
            */

            container.innerHTML += `

                <div class="booking-card">

                    <!-- =========================
                         CARD HEADER
                    ========================== -->

                    <div class="booking-card-header">

                        <div class="booking-service-info">

                            <div class="booking-service-icon">
                                🛠
                            </div>

                            <div class="booking-service-title">

                                <h3>
                                    ${escapeHTML(
                                        b.service || 'Service'
                                    )}
                                </h3>

                                <p class="booking-number">
                                    Booking #${escapeHTML(b.id)}
                                </p>

                            </div>

                        </div>


                        <span class="badge ${statusClass}">
                            ${statusText}
                        </span>

                    </div>


                    <!-- =========================
                         CARD BODY
                    ========================== -->

                    <div class="booking-card-body">


                        <!-- BOOKING INFORMATION -->

                        <div class="booking-section">

                            <div class="booking-section-title">
                                <span>📅</span>
                                Booking Information
                            </div>

                            <div class="booking-info-grid">

                                <div class="booking-info-item">

                                    <span class="booking-info-label">
                                        Date
                                    </span>

                                    <span class="booking-info-value">
                                        ${formatDate(b.booking_date)}
                                    </span>

                                </div>


                                <div class="booking-info-item">

                                    <span class="booking-info-label">
                                        Time Slot
                                    </span>

                                    <span class="booking-info-value">
                                        ${formatTimeRange(
                                            b.time_start,
                                            b.time_end
                                        )}
                                    </span>

                                </div>


                                <div class="booking-info-item">

                                    <span class="booking-info-label">
                                        Technician
                                    </span>

                                    <span class="booking-info-value">
                                        ${techDisplayName}
                                    </span>

                                </div>


                                <div class="booking-info-item">

                                    <span class="booking-info-label">
                                        Contact Number
                                    </span>

                                    <span class="booking-info-value">
                                        ${b.phone
                                            ? escapeHTML(b.phone)
                                            : 'Not Available'}
                                    </span>

                                </div>

                            </div>

                        </div>


                        <!-- SERVICE ADDRESS -->

                        <div class="booking-section">

                            <div class="booking-section-title">
                                <span>📍</span>
                                Service Address
                            </div>

                            <div class="booking-address">
                                📍 ${addressHTML}
                            </div>

                        </div>


                        <!-- CUSTOMER NOTES -->

                        <div class="booking-section">

                            <div class="booking-section-title">
                                <span>📝</span>
                                Customer Request / Notes
                            </div>

                            ${notesHTML}

                        </div>


                        <!-- PAYMENT INFORMATION -->

                        <div class="booking-section">

                            <div class="booking-section-title">
                                <span>💰</span>
                                Payment Information
                            </div>

                            <div class="booking-payment">


                                <div class="payment-box">

                                    <span class="payment-label">
                                        Total Amount
                                    </span>

                                    <div class="payment-total">
                                        ${formatCurrency(
                                            b.total_amount
                                        )}
                                    </div>

                                </div>


                                <div class="payment-box">

                                    <span class="payment-label">
                                        Payment Method
                                    </span>

                                    <strong>
                                        ${escapeHTML(paymentMethod)}
                                    </strong>

                                </div>


                                <div class="payment-box">

                                    <span class="payment-label">
                                        Payment Status
                                    </span>

                                    <span class="payment-status ${paymentStatus.className}">
                                        ${escapeHTML(paymentStatus.text)}
                                    </span>

                                </div>


                                <div class="payment-box">

                                    <span class="payment-label">
                                        Labor Cost
                                    </span>

                                    <strong>
                                        ${formatCurrency(
                                            b.labor_cost_amount
                                        )}
                                    </strong>

                                </div>

                            </div>

                        </div>


                        <!-- REQUESTED -->

                        <div class="booking-requested">

                            🕒 Requested:

                            <strong>
                                ${formatRequestedDate(
                                    b.created_at
                                )}
                            </strong>

                        </div>

                    </div>


                    <!-- =========================
                         CARD FOOTER / ACTIONS
                    ========================== -->

                    ${
                        actionButton
                        ? `
                            <div class="booking-card-footer">

                                <div class="booking-actions">

                                    ${actionButton}

                                </div>

                            </div>
                        `
                        : ''
                    }

                </div>

            `;
        });

    } catch (e) {

        console.error("Fetch Error:", e);

        container.innerHTML = `

            <div style="
                text-align:center;
                padding:30px;
            ">

                <p style="color:red;">
                    Failed to load bookings.
                </p>

                <button
                    onclick="loadBookings()"
                    style="
                        background:#eee;
                        border:none;
                        padding:8px 15px;
                        border-radius:7px;
                        cursor:pointer;
                    ">

                    Retry

                </button>

            </div>
        `;
    }
}


/* =========================================================
   ❌ CANCEL BOOKING LOGIC
========================================================= */

function openCancelModal(id) {

    cancelBookingId = id;

    document.getElementById("cancelModal").style.display = "flex";
}


function closeCancelModal() {

    cancelBookingId = null;

    document.getElementById("cancelModal").style.display = "none";
}


async function confirmCancelBooking() {

    const formData = new FormData();

    formData.append(
        "booking_id",
        cancelBookingId
    );

    try {

        const res = await fetch(
            "../backend/bookings/cancel_booking.php",
            {
                method: "POST",
                body: formData
            }
        );

        const data = await res.json();

        if (data.success) {

            closeCancelModal();

            alert("✅ Booking cancelled successfully.");

            loadBookings();

        } else {

            alert(data.error);

        }

    } catch (err) {

        console.error(err);

        alert("Network Error.");
    }
}


async function cancelBooking(bookingId) {

    const formData = new FormData();

    formData.append(
        'booking_id',
        bookingId
    );

    try {

        const res = await fetch(
            '../backend/bookings/cancel_booking.php',
            {
                method: 'POST',
                body: formData
            }
        );

        const data = await res.json();

        if (data.success) {

            alert(
                '✅ Booking cancelled successfully.'
            );

            loadBookings();

        } else {

            alert(
                'Error cancelling booking: ' +
                data.error
            );
        }

    } catch (err) {

        console.error(
            "Error cancelling:",
            err
        );

        alert(
            'A network error occurred while cancelling.'
        );
    }
}


/* =========================================================
   ⭐ RATING MODAL LOGIC
========================================================= */

function openRateModal(
    bookingId,
    techName
) {

    document.getElementById(
        'rate-booking-id'
    ).value = bookingId;

    document.getElementById(
        'rate-tech-name'
    ).innerText =
        `Technician: ${techName}`;

    document.getElementById(
        'rateModal'
    ).style.display = 'flex';
}


function closeRateModal() {

    document.getElementById(
        'rateModal'
    ).style.display = 'none';

    document.getElementById(
        'ratingForm'
    ).reset();
}


document.getElementById(
    'ratingForm'
).addEventListener(
    'submit',
    async function(e) {

        e.preventDefault();

        const bookingId =
            document.getElementById(
                'rate-booking-id'
            ).value;

        const selectedRating =
            document.querySelector(
                'input[name="rating"]:checked'
            );

        if (!selectedRating) {

            alert(
                'Please select a rating first.'
            );

            return;
        }

        const rating =
            selectedRating.value;

        const comment =
            document.getElementById(
                'rate-comment'
            ).value;

        const formData =
            new FormData();

        formData.append(
            'booking_id',
            bookingId
        );

        formData.append(
            'rating',
            rating
        );

        formData.append(
            'comment',
            comment
        );

        try {

            const res =
                await fetch(
                    '../backend/bookings/submit_review.php',
                    {
                        method: 'POST',
                        body: formData
                    }
                );

            const data =
                await res.json();

            if (data.success) {

                alert(
                    '⭐ Thank you for your feedback!'
                );

                closeRateModal();

                loadBookings();

            } else {

                alert(
                    'Error submitting review: ' +
                    data.error
                );
            }

        } catch (err) {

            console.error(
                "Error rating:",
                err
            );
        }
    }
);


/* =========================================================
   💬 LIVE CHAT LOGIC
========================================================= */

function openChatModal(
    bookingId,
    name
) {

    currentChatBookingId =
        bookingId;

    document.getElementById(
        'chat-person-name'
    ).innerText =
        name;

    document.getElementById(
        'chatModal'
    ).style.display =
        'flex';

    loadMessages();

    chatInterval =
        setInterval(
            loadMessages,
            2000
        );
}


function closeChatModal() {

    document.getElementById(
        'chatModal'
    ).style.display =
        'none';

    clearInterval(
        chatInterval
    );

    currentChatBookingId =
        null;

    lastMessageCount =
        0;
}


async function loadMessages() {

    if (!currentChatBookingId) {
        return;
    }

    try {

        const res =
            await fetch(
                `../backend/chat/get_messages.php?booking_id=${currentChatBookingId}`
            );

        const messages =
            await res.json();

        const chatBox =
            document.getElementById(
                'chat-messages'
            );

        if (
            messages.length !==
            lastMessageCount
        ) {

            chatBox.innerHTML = '';

            messages.forEach(m => {

                const isMine =
                    (
                        m.is_mine === 1 ||
                        m.is_mine === "1"
                    );

                const alignClass =
                    isMine
                        ? 'mine'
                        : 'theirs';

                let msgContent = '';

                if (m.image) {

                    msgContent += `
                        <img
                            src="../uploads/chat/${encodeURIComponent(m.image)}"
                            style="
                                max-width:100%;
                                border-radius:8px;
                                display:block;
                                margin-bottom:5px;
                            "
                        >
                    `;
                }

                if (m.message) {

                    msgContent += `
                        <span>
                            ${escapeHTML(m.message)}
                        </span>
                    `;
                }

                chatBox.innerHTML += `
                    <div class="msg ${alignClass}">
                        ${msgContent}
                    </div>
                `;
            });

            chatBox.scrollTop =
                chatBox.scrollHeight;

            lastMessageCount =
                messages.length;
        }

    } catch(e) {

        console.error(e);
    }
}


document.getElementById(
    'chatForm'
).addEventListener(
    'submit',
    async (e) => {

        e.preventDefault();

        const input =
            document.getElementById(
                'chat-input'
            );

        const imageInput =
            document.getElementById(
                'chat-image'
            );

        const msg =
            input.value.trim();

        const imageFile =
            imageInput.files[0];

        if (
            !msg &&
            !imageFile
        ) {
            return;
        }

        const fd =
            new FormData();

        fd.append(
            'booking_id',
            currentChatBookingId
        );

        fd.append(
            'message',
            msg
        );

        if (imageFile) {

            fd.append(
                'image',
                imageFile
            );
        }

        input.value = '';

        imageInput.value = '';

        document.getElementById(
            'chat-img-btn'
        ).style.background = '#eee';

        document.getElementById(
            'chat-img-btn'
        ).style.color = '#333';

        try {

            await fetch(
                '../backend/chat/send_message.php',
                {
                    method: 'POST',
                    body: fd
                }
            );

            loadMessages();

        } catch(e) {

            console.error(e);
        }
    }
);