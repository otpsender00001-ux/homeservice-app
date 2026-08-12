let watchId = null;
let techId = null; 
let chatInterval = null; 
let currentChatBookingId = null;
let lastMessageCount = 0;

document.addEventListener('DOMContentLoaded', async () => {

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

        // Close when clicking outside the modal
        logoutModal.addEventListener("click", function(e) {
            if (e.target === logoutModal) {
                logoutModal.classList.remove("show");
            }
        });
    }
    
    techId = await getSessionId();
    if (techId) {
        fetchJobs();
    } else {
        alert("Session expired. Please login again.");
        window.location.href = '../index.html'; 
    }
});

async function getSessionId() {
    try {
        const response = await fetch('../backend/auth/get_session.php');
        const data = await response.json();
        return data.user_id; 
    } catch (e) {
        console.error("Session Error:", e);
        return null;
    }
}

// ✨ DAGDAG NA FUNCTION PARA SA COUNTDOWN LOGIC ✨
function getStartTravelButton(jobId, bookingDateStr) {
    if (!bookingDateStr) {
        return `<button class="action-btn btn-start" onclick="startTravel(${jobId})">📍 Start Travel</button>`;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); // I-reset ang oras para araw lang ang i-compare

    const bookingDate = new Date(bookingDateStr);
    bookingDate.setHours(0, 0, 0, 0);

    const timeDiff = bookingDate.getTime() - today.getTime();
    const diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24));

    if (diffDays <= 0) {
        // Ngayon na o nakalipas na ang araw, Pwede na i-start!
        return `<button class="action-btn btn-start" onclick="startTravel(${jobId})">📍 Start Travel</button>`;
    } else {
        // Sa susunod na araw pa
        let diffText = '';
        if (diffDays === 1) {
            diffText = '1 day to start';
        } else if (diffDays < 7) {
            diffText = `${diffDays} days to start`;
        } else {
            const weeks = Math.floor(diffDays / 7);
            const extraDays = diffDays % 7;
            if (extraDays === 0) {
                diffText = `${weeks} week${weeks > 1 ? 's' : ''} to start`;
            } else {
                diffText = `${weeks} week${weeks > 1 ? 's' : ''} and ${extraDays} day${extraDays > 1 ? 's' : ''} to start`;
            }
        }
        
        // I-return ang naka-disable na button
        return `<button class="action-btn btn-start" style="background-color: #ccc; cursor: not-allowed; border: none; color: #666;" disabled>⏳ ${diffText}</button>`;
    }
}

async function fetchJobs() {
    if (!techId) return; 
    
    try {
        const response = await fetch(`../backend/technician/get_jobs.php?tech_id=${techId}`);
        const jobs = await response.json();
        
        const container = document.getElementById('jobs-container');
        if (container) container.innerHTML = '';

        if (jobs.length === 0) {
            // TRANSLATED TO ENGLISH
            container.innerHTML = `<div style="grid-column: 1 / -1; text-align:center; padding: 40px; background:white; border-radius:12px; color:#888;">You currently have no assigned jobs.</div>`;
            return;
        }

        jobs.forEach(job => {
            let actionHtml = '';
            let chatBtn = '';

            // Buttons Logic
            if (job.status === 'accepted' || job.status === 'in_progress') {
                chatBtn = `<button class="action-btn btn-chat" onclick="openChatModal(${job.id}, '${job.customer}')">💬 Chat Customer</button>`;
            }

            if (job.status === 'accepted') {
                // ✨ GINAMIT NATIN DITO YUNG BAGONG LOGIC ✨
                const startBtn = getStartTravelButton(job.id, job.booking_date);
                actionHtml = `${chatBtn} ${startBtn}`;
            } else if (job.status === 'in_progress') {
                actionHtml = `${chatBtn} 
<button 
    class="action-btn btn-complete" 
    onclick="openCompletionModal(${job.id})"
>
    🔧 Complete Service
</button>`;
                // Auto start GPS kung in_progress pa lang siya pagbukas
                if (!watchId) startTrackingLogic(); 
            }

            // Formatting Date & Time
            let formattedDate = job.booking_date ? new Date(job.booking_date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' }) : 'To Be Scheduled';
            
            let formatTime = (timeStr) => {
                if(!timeStr) return '';
                let [h, m] = timeStr.split(':');
                let ampm = h >= 12 ? 'PM' : 'AM';
                h = h % 12 || 12;
                return `${h}:${m} ${ampm}`;
            };
            
            let timeRange = (job.time_start && job.time_end) ? `${formatTime(job.time_start)} - ${formatTime(job.time_end)}` : (job.time_start ? formatTime(job.time_start) : 'Anytime');
            
            // TRANSLATED TO ENGLISH
            let address = job.address || 'No address provided';
            let phone = job.customer_phone || 'N/A';
            let notes = job.notes || 'No additional notes from the customer.';

            // RENDER LARGE CARD
            container.innerHTML += `
                <div class="job-card-large ${job.status === 'in_progress' ? 'active-job' : ''}">
                    
                    <div class="job-card-header">
                        <h3 class="job-card-title">${job.service_name}</h3>
                        <span class="job-badge ${getStatusClass(job.status)}">${job.status.replace('_', ' ')}</span>
                    </div>
                    
                    <div class="job-detail-row">
                        <span class="job-detail-icon">👤</span>
                        <div class="job-detail-text">
                            <strong>Customer Name</strong>
                            <span class="main-text">${job.customer}</span>
                        </div>
                    </div>

                    <div class="job-detail-row">
                        <span class="job-detail-icon">📞</span>
                        <div class="job-detail-text">
                            <strong>Contact Number</strong>
                            <span class="main-text">${phone}</span>
                        </div>
                    </div>

                    <div class="job-detail-row">
                        <span class="job-detail-icon">📅</span>
                        <div class="job-detail-text">
                            <strong>Schedule</strong>
                            <span class="main-text">${formattedDate}</span><br>
                            <span style="color:#ff4500; font-weight:700; font-size:13px;">🕒 ${timeRange}</span>
                        </div>
                    </div>

                    <div class="job-detail-row">
                        <span class="job-detail-icon">📍</span>
                        <div class="job-detail-text">
                            <strong>Service Address</strong>
                            <span class="main-text">${address}</span>
                        </div>
                    </div>

                    <div class="job-detail-row" style="margin-bottom: 0;">
                        <span class="job-detail-icon">📝</span>
                        <div class="job-detail-text">
                            <strong>Job Notes</strong>
                            <em style="color:#666; font-size:13px;">"${notes}"</em>
                        </div>
                    </div>

                    <div class="job-actions">
                        ${actionHtml}
                    </div>
                </div>
            `;
        });
    } catch (e) { 
        console.error("Error fetching jobs:", e); 
    }
}

/* =====================
🚀 TRAVEL LOGIC & GEOLOCATION
===================== */


async function startTravel(bookingId) {
    if (confirm("Start travel? Your location will now be tracked by the Admin and the User.")) {
        await updateStatus(bookingId, 'in_progress');
        startTrackingLogic();
        alert("GPS Tracking Started! You are now marked as on the way.");
    }
}

function startTrackingLogic() {
    if ("geolocation" in navigator) {
        showGpsIndicator(true);
        watchId = navigator.geolocation.watchPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                sendLocation(lat, lng);
                console.log(`Live Location: ${lat}, ${lng}`);
            },
            (err) => {
                console.error("GPS Error: ", err);
                // TRANSLATED TO ENGLISH
                let msg = "Please enable your GPS.";
                if(err.code == 1) msg = "Browser blocked GPS access.";
                alert(msg);
            },
            { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
        );
    } else {
        // TRANSLATED TO ENGLISH
        alert("GPS is not supported in this browser.");
    }
}

function stopTracking() {
    if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
        showGpsIndicator(false);
        console.log("Tracking Stopped frontend side.");
    }
    sendLocation(null, null); 
}

async function sendLocation(lat, lng) {
    if (!techId) return;
    const payload = { lat: lat, lng: lng, user_id: techId };
    try {
        await fetch('../backend/users/update_location.php', { 
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
        });
    } catch (e) { console.error("Failed to sync location:", e); }
}

async function updateStatus(bookingId, status) {
    const fd = new FormData();
    fd.append('booking_id', bookingId);
    fd.append('status', status);
    
    try {
        const response = await fetch('../backend/technician/update_job_status.php', { method: 'POST', body: fd });
        if (status === 'completed' || status === 'cancelled') {
            stopTracking();
        }
        fetchJobs(); 
    } catch (e) { console.error("Status update failed:", e); }
}

function showGpsIndicator(show) {
    const indicator = document.getElementById('gps-status');
    if (indicator) {
        indicator.style.display = show ? 'block' : 'none';
        indicator.innerHTML = show ? '📡 LIVE GPS TRACKING ACTIVE - Admin is monitoring your location' : '';
    }
}

function getStatusClass(s) {
    switch(s) {
        case 'pending': return 'badge-orange';
        case 'accepted': return 'badge-blue';
        case 'in_progress': return 'badge-orange';
        case 'completed': return 'badge-green';
        default: return 'badge-gray';
    }
}

/* =====================
💬 LIVE CHAT LOGIC (WITH IMAGE)
===================== */
function openChatModal(bookingId, name) {
    currentChatBookingId = bookingId;
    document.getElementById('chat-person-name').innerText = name;
    document.getElementById('chatModal').style.display = 'flex';
    loadMessages();
    chatInterval = setInterval(loadMessages, 2000); 
}

function closeChatModal() {
    document.getElementById('chatModal').style.display = 'none';
    clearInterval(chatInterval);
    currentChatBookingId = null;
    lastMessageCount = 0;
}

async function loadMessages() {
    if(!currentChatBookingId) return;
    try {
        const res = await fetch(`../backend/chat/get_messages.php?booking_id=${currentChatBookingId}`);
        const messages = await res.json();
        
        const chatBox = document.getElementById('chat-messages');
        
        if(messages.length !== lastMessageCount) {
            chatBox.innerHTML = '';
            messages.forEach(m => {
                const isMine = (m.is_mine === 1 || m.is_mine === "1");
                const alignClass = isMine ? 'mine' : 'theirs';
                
                let msgContent = '';
                if(m.image) { msgContent += `<img src="../uploads/chat/${m.image}" style="max-width: 100%; border-radius: 8px; display: block; margin-bottom: 5px;">`; }
                if(m.message) { msgContent += `<span>${m.message}</span>`; }
                
                chatBox.innerHTML += `<div class="msg ${alignClass}">${msgContent}</div>`;
            });
            chatBox.scrollTop = chatBox.scrollHeight; 
            lastMessageCount = messages.length;
        }
    } catch(e) { console.error(e); }
}

document.getElementById('chatForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('chat-input');
    const imageInput = document.getElementById('chat-image');
    
    const msg = input.value.trim();
    const imageFile = imageInput.files[0];

    if(!msg && !imageFile) return;

    const fd = new FormData();
    fd.append('booking_id', currentChatBookingId);
    fd.append('message', msg);
    if(imageFile) { fd.append('image', imageFile); }

    input.value = ''; 
    imageInput.value = '';
    document.getElementById('chat-img-btn').style.background = '#eee';
    document.getElementById('chat-img-btn').style.color = '#333';

    try {
        await fetch('../backend/chat/send_message.php', { method: 'POST', body: fd });
        loadMessages(); 
    } catch(e) { console.error(e); }
});

/* =====================================================
   🔧 JOB COMPLETION REPORT
===================================================== */

/* =====================================================
   🔩 REPLACEMENT PART PRICES
===================================================== */

const replacementParts = {

    "Capacitor": 850,
    "Contactor": 950,
    "Wiring": 500,
    "PCB / Control Board": 4500,
    "Thermostat": 1200,

    "Compressor": 8500,
    "Fan Motor": 2500,
    "Blower Motor": 2800,
    "Fan Blade": 1200,
    "Bearing": 700,

    "Thermistor / Sensor": 900,
    "Relay": 650,
    "Drain Pump": 1800,
    "Swing Motor": 1000,

    "Other": 0
};


/* =====================================================
   CURRENT COMPLETION BOOKING
===================================================== */

let currentCompletionBookingId = null;


/* =====================================================
   OPEN COMPLETION MODAL
===================================================== */

function openCompletionModal(bookingId) {

    currentCompletionBookingId = bookingId;

    const modal = document.getElementById('completionModal');
    const form = document.getElementById('completionForm');

    if (!modal) {
        console.error("Completion modal not found.");
        return;
    }

    /* =========================
       RESET FORM
    ========================= */

    if (form) {
        form.reset();
    }


    /* =========================
       SET BOOKING ID
    ========================= */

    const bookingInput =
        document.getElementById('completion-booking-id');

    if (bookingInput) {
        bookingInput.value = bookingId;
    }


    /* =========================
       RESET REPLACEMENT PARTS
    ========================= */

    const replacementContainer =
        document.getElementById('replacement-items-container');

    if (replacementContainer) {
        replacementContainer.innerHTML = '';
    }


    const replacementTotal =
        document.getElementById('replacement-total');

    if (replacementTotal) {
        replacementTotal.textContent = '0.00';
    }


    const replacementCost =
        document.getElementById('replacement-cost');

    if (replacementCost) {
        replacementCost.value = '0';
    }


    const replacedParts =
        document.getElementById('replaced-parts');

    if (replacedParts) {
        replacedParts.value = '';
    }


    /* =========================
       RESET PHOTO
    ========================= */

    resetCompletionPhoto();


    /* =========================
       ENABLE BUTTONS
    ========================= */

    const submitBtn =
        document.getElementById('submit-completion-btn');

    const cancelBtn =
        document.getElementById('cancel-completion-btn');

    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '✅ Finish Job';
    }

    if (cancelBtn) {
        cancelBtn.disabled = false;
    }


    /* =========================
       SHOW MODAL
    ========================= */

    modal.classList.add('show');


    /* Prevent background scrolling */
    document.body.style.overflow = 'hidden';
}


/* =====================================================
   CLOSE COMPLETION MODAL
===================================================== */

function closeCompletionModal() {

    const modal =
        document.getElementById('completionModal');

    if (modal) {
        modal.classList.remove('show');
    }

    currentCompletionBookingId = null;

    /* Restore page scrolling */
    document.body.style.overflow = '';
}


/* =====================================================
   CLOSE WHEN CLICKING OUTSIDE
===================================================== */

document.addEventListener('click', function(e) {

    const modal =
        document.getElementById('completionModal');

    if (!modal) return;

    if (e.target === modal) {
        closeCompletionModal();
    }

});


/* =====================================================
   ESC KEY TO CLOSE
===================================================== */

document.addEventListener('keydown', function(e) {

    if (e.key !== 'Escape') return;

    const modal =
        document.getElementById('completionModal');

    if (!modal) return;

    if (modal.classList.contains('show')) {
        closeCompletionModal();
    }

});


/* =====================================================
   🔩 ADD REPLACEMENT PART
===================================================== */

function addReplacementPart() {

    const container =
        document.getElementById('replacement-items-container');

    if (!container) {
        console.error(
            "replacement-items-container not found."
        );

        return;
    }


    const row =
        document.createElement('div');

    row.className = 'replacement-item';


    /* =========================
       CREATE OPTIONS
    ========================= */

    const options = Object.entries(replacementParts)
        .map(([name, price]) => {

            return `
                <option
                    value="${name}"
                    data-price="${price}"
                >
                    ${name}
                </option>
            `;

        })
        .join('');


    /* =========================
       ROW HTML
    ========================= */

    row.innerHTML = `

        <div class="replacement-part-info">

            <select
                class="replacement-select"
            >

                <option value="">
                    Select replaced part
                </option>

                ${options}

            </select>


            <input
                type="text"
                class="custom-part-input"
                placeholder="Enter custom part name"
            >

        </div>


        <div class="replacement-price-wrapper">

            <span class="replacement-currency">
                ₱
            </span>

            <input
                type="number"
                class="replacement-price"
                value="0"
                min="0"
                step="0.01"
                placeholder="0.00"
            >

        </div>


        <button
            type="button"
            class="remove-replacement-btn"
            title="Remove part"
        >
            ×
        </button>

    `;


    container.appendChild(row);


    /* =========================
       SELECT EVENT
    ========================= */

    const select =
        row.querySelector('.replacement-select');

    if (select) {

        select.addEventListener(
            'change',
            function() {

                handleReplacementChange(this);

            }
        );

    }


    /* =========================
       PRICE EVENT
    ========================= */

    const priceInput =
        row.querySelector('.replacement-price');

    if (priceInput) {

        priceInput.addEventListener(
            'input',
            calculateReplacementTotal
        );

    }


    /* =========================
       CUSTOM PART EVENT
    ========================= */

    const customInput =
        row.querySelector('.custom-part-input');

    if (customInput) {

        customInput.addEventListener(
            'input',
            function() {

                calculateReplacementTotal();

            }
        );

    }


    /* =========================
       REMOVE BUTTON
    ========================= */

    const removeButton =
        row.querySelector('.remove-replacement-btn');

    if (removeButton) {

        removeButton.addEventListener(
            'click',
            function() {

                removeReplacementPart(this);

            }
        );

    }


    calculateReplacementTotal();
}


/* =====================================================
   HANDLE PART SELECTION
===================================================== */

function handleReplacementChange(select) {

    const row =
        select.closest('.replacement-item');

    if (!row) return;


    const priceInput =
        row.querySelector('.replacement-price');

    const customInput =
        row.querySelector('.custom-part-input');


    const selectedOption =
        select.options[select.selectedIndex];


    const selectedPart =
        select.value;


    /* =========================
       NO PART SELECTED
    ========================= */

    if (!selectedPart) {

        if (priceInput) {
            priceInput.value = '0';
        }

        if (customInput) {

            customInput.classList.remove('show');
            customInput.value = '';

        }

        calculateReplacementTotal();

        return;
    }


    /* =========================
       CUSTOM PART
    ========================= */

    if (selectedPart === 'Other') {

        if (customInput) {

            customInput.classList.add('show');

            customInput.focus();

        }

        if (priceInput) {
            priceInput.value = '0';
        }

    }


    /* =========================
       NORMAL PART
    ========================= */

    else {

        if (customInput) {

            customInput.classList.remove('show');
            customInput.value = '';

        }

        const price =
            selectedOption.dataset.price || 0;

        if (priceInput) {

            priceInput.value =
                parseFloat(price).toFixed(2);

        }

    }


    calculateReplacementTotal();
}


/* =====================================================
   REMOVE REPLACEMENT PART
===================================================== */

function removeReplacementPart(button) {

    const row =
        button.closest('.replacement-item');

    if (!row) return;

    row.remove();

    calculateReplacementTotal();
}


/* =====================================================
   CALCULATE REPLACEMENT TOTAL
===================================================== */

function calculateReplacementTotal() {

    const rows =
        document.querySelectorAll(
            '#replacement-items-container .replacement-item'
        );


    let total = 0;


    rows.forEach(row => {

        const select =
            row.querySelector('.replacement-select');

        const priceInput =
            row.querySelector('.replacement-price');


        if (!select || !priceInput) {
            return;
        }


        /* Only count selected parts */

        if (!select.value) {
            return;
        }


        const price =
            parseFloat(priceInput.value) || 0;


        total += price;

    });


    /* =========================
       UPDATE DISPLAY
    ========================= */

    const totalDisplay =
        document.getElementById('replacement-total');

    if (totalDisplay) {

        totalDisplay.textContent =
            total.toFixed(2);

    }


    /* =========================
       UPDATE HIDDEN INPUT
    ========================= */

    const replacementCost =
        document.getElementById('replacement-cost');

    if (replacementCost) {

        replacementCost.value =
            total.toFixed(2);

    }


    /* =========================
       UPDATE PARTS TEXT
    ========================= */

    updateReplacedPartsHidden();
}


/* =====================================================
   UPDATE HIDDEN REPLACED PARTS
===================================================== */

function updateReplacedPartsHidden() {

    const rows =
        document.querySelectorAll(
            '#replacement-items-container .replacement-item'
        );


    const parts = [];


    rows.forEach(row => {

        const select =
            row.querySelector('.replacement-select');

        const customInput =
            row.querySelector('.custom-part-input');

        const priceInput =
            row.querySelector('.replacement-price');


        if (!select || !select.value) {
            return;
        }


        let partName =
            select.value;


        /* =========================
           CUSTOM PART NAME
        ========================= */

        if (
            partName === 'Other' &&
            customInput &&
            customInput.value.trim()
        ) {

            partName =
                customInput.value.trim();

        }


        const price =
            parseFloat(
                priceInput?.value
            ) || 0;


        parts.push(
            `${partName} - ₱${price.toFixed(2)}`
        );

    });


    const hidden =
        document.getElementById('replaced-parts');


    if (hidden) {

        hidden.value =
            parts.join(', ');

    }

}


/* =====================================================
   📷 PHOTO PREVIEW
===================================================== */

function setupCompletionPhoto() {

    const completionPhotoInput =
        document.getElementById(
            'completion-photo-input'
        );


    if (!completionPhotoInput) {
        return;
    }


    /* Prevent duplicate listener */

    if (
        completionPhotoInput.dataset.initialized === 'true'
    ) {
        return;
    }


    completionPhotoInput.dataset.initialized = 'true';


    completionPhotoInput.addEventListener(
        'change',
        function() {

            const file =
                this.files[0];


            if (!file) {

                resetCompletionPhoto();

                return;
            }


            /* =========================
               CHECK FILE SIZE
            ========================= */

            if (
                file.size >
                5 * 1024 * 1024
            ) {

                alert(
                    'Photo must be smaller than 5MB.'
                );

                this.value = '';

                resetCompletionPhoto();

                return;
            }


            /* =========================
               CHECK FILE TYPE
            ========================= */

            const allowedTypes = [
                'image/jpeg',
                'image/png',
                'image/webp'
            ];


            if (
                !allowedTypes.includes(
                    file.type
                )
            ) {

                alert(
                    'Please select a JPG, PNG, or WEBP image.'
                );

                this.value = '';

                resetCompletionPhoto();

                return;
            }


            /* =========================
               PREVIEW
            ========================= */

            const reader =
                new FileReader();


            reader.onload =
                function(e) {

                    const preview =
                        document.getElementById(
                            'completion-photo-preview'
                        );


                    const uploadContent =
                        document.getElementById(
                            'photo-upload-content'
                        );


                    if (preview) {

                        preview.src =
                            e.target.result;

                        preview.style.display =
                            'block';

                    }


                    if (uploadContent) {

                        uploadContent.style.display =
                            'none';

                    }

                };


            reader.readAsDataURL(file);

        }
    );
}


/* =====================================================
   RESET PHOTO
===================================================== */

function resetCompletionPhoto() {

    const input =
        document.getElementById(
            'completion-photo-input'
        );


    const preview =
        document.getElementById(
            'completion-photo-preview'
        );


    const content =
        document.getElementById(
            'photo-upload-content'
        );


    if (input) {
        input.value = '';
    }


    if (preview) {

        preview.src = '';

        preview.style.display =
            'none';

    }


    if (content) {

        content.style.display =
            'block';

    }

}


/* =====================================================
   📝 SUBMIT COMPLETION REPORT
===================================================== */

function setupCompletionForm() {

    const completionForm =
        document.getElementById(
            'completionForm'
        );


    if (!completionForm) {
        return;
    }


    /* Prevent duplicate listener */

    if (
        completionForm.dataset.initialized === 'true'
    ) {
        return;
    }


    completionForm.dataset.initialized = 'true';


    completionForm.addEventListener(
        'submit',
        async function(e) {

            e.preventDefault();


            /* =========================
               CHECK BOOKING
            ========================= */

            if (!currentCompletionBookingId) {

                alert(
                    'Invalid booking.'
                );

                return;
            }


            /* =========================
               BUTTONS
            ========================= */

            const submitBtn =
                document.getElementById(
                    'submit-completion-btn'
                );


            const cancelBtn =
                document.getElementById(
                    'cancel-completion-btn'
                );


            /* =========================
               REQUIRED FIELDS
            ========================= */

            const problemField =
                document.getElementById(
                    'problem-found'
                );


            const workField =
                document.getElementById(
                    'work-done'
                );


            const problemFound =
                problemField
                    ? problemField.value.trim()
                    : '';


            const workDone =
                workField
                    ? workField.value.trim()
                    : '';


            if (!problemFound) {

                alert(
                    'Please describe the problem found.'
                );

                if (problemField) {
                    problemField.focus();
                }

                return;
            }


            if (!workDone) {

                alert(
                    'Please describe the work done.'
                );

                if (workField) {
                    workField.focus();
                }

                return;
            }


            /* =========================
               PHOTO CHECK
            ========================= */

            const photoInput =
                document.getElementById(
                    'completion-photo-input'
                );


            if (
                photoInput &&
                photoInput.files.length > 0
            ) {

                const photo =
                    photoInput.files[0];


                if (
                    photo.size >
                    5 * 1024 * 1024
                ) {

                    alert(
                        'Photo must be smaller than 5MB.'
                    );

                    return;
                }

            }


            /* =========================
               CONFIRM
            ========================= */

            const confirmed =
                confirm(
                    'Are you sure the service is completely finished?\n\n' +
                    'Once you finish the job, the booking will be marked as completed and GPS tracking will stop.'
                );


            if (!confirmed) {
                return;
            }


            /* =========================
               UPDATE PART DATA
            ========================= */

            calculateReplacementTotal();
            updateReplacedPartsHidden();


            /* =========================
               DISABLE BUTTONS
            ========================= */

            if (submitBtn) {

                submitBtn.disabled =
                    true;

                submitBtn.innerHTML = `
                    <span class="spinner"></span>
                    Completing Job...
                `;

            }


            if (cancelBtn) {
                cancelBtn.disabled = true;
            }


            /* =========================
               FORM DATA
            ========================= */

            const formData =
                new FormData(
                    completionForm
                );


            /* =========================
               COLLECT ELECTRICAL
            ========================= */

            const electrical =
                Array.from(
                    document.querySelectorAll(
                        '#completionForm input[name="electrical_component"]:checked'
                    )
                ).map(
                    checkbox =>
                        checkbox.value
                );


            /* =========================
               COLLECT MECHANICAL
            ========================= */

            const mechanical =
                Array.from(
                    document.querySelectorAll(
                        '#completionForm input[name="mechanical_component"]:checked'
                    )
                ).map(
                    checkbox =>
                        checkbox.value
                );


            /* =========================
               ADD COMPONENT DATA
            ========================= */

            formData.set(
                'electrical_components',
                electrical.join(', ')
            );


            formData.set(
                'mechanical_components',
                mechanical.join(', ')
            );


            /* Make absolutely sure booking ID exists */

            formData.set(
                'booking_id',
                currentCompletionBookingId
            );


            /* =========================
               SEND TO PHP
            ========================= */

            try {

                const response =
                    await fetch(
                        '../backend/technician/submit_completion_report.php',
                        {
                            method: 'POST',
                            body: formData
                        }
                    );


                const responseText = await response.text();

console.log('RAW PHP RESPONSE:', responseText);

let result;

try {
    result = JSON.parse(responseText);
} catch (parseError) {

    console.error(
        'PHP returned invalid JSON:',
        responseText
    );

    alert(
        '❌ PHP ERROR:\n\n' +
        responseText
    );

    submitBtn.disabled = false;
    cancelBtn.disabled = false;
    submitBtn.innerHTML = '✅ Finish Job';

    return;
}


                console.log(
                    'Completion response:',
                    result
                );


                /* =========================
                   SUCCESS
                ========================= */

                if (result.success) {

                    /* Stop GPS */

                    stopTracking();


                    /* Close modal */

                    closeCompletionModal();


                    /* Success message */

                    alert(
                        '✅ Job Completed Successfully!'
                    );


                    /* Reload jobs */

                    await fetchJobs();

                }


                /* =========================
                   ERROR
                ========================= */

                else {

                    alert(
                        '❌ ' +
                        (
                            result.message ||
                            'Failed to complete job.'
                        )
                    );


                    if (submitBtn) {

                        submitBtn.disabled =
                            false;

                        submitBtn.innerHTML =
                            '✅ Finish Job';

                    }


                    if (cancelBtn) {
                        cancelBtn.disabled =
                            false;
                    }

                }


            } catch (error) {

    console.error('Completion Error:', error);

    alert(
        '❌ Completion Error:\n\n' +
        error.message
    );

    submitBtn.disabled = false;
    cancelBtn.disabled = false;

    submitBtn.innerHTML =
        '✅ Finish Job';
}

        }
    );
}


/* =====================================================
   ➕ ADD BUTTON EVENT
===================================================== */

function setupReplacementButton() {

    const addButton =
        document.getElementById(
            'add-replacement-btn'
        );


    if (!addButton) {
        return;
    }


    if (
        addButton.dataset.initialized === 'true'
    ) {
        return;
    }


    addButton.dataset.initialized =
        'true';


    addButton.addEventListener(
        'click',
        function() {

            addReplacementPart();

        }
    );

}


/* =====================================================
   🚀 INITIALIZE COMPLETION MODAL
===================================================== */

function initializeCompletionModal() {

    setupCompletionPhoto();

    setupCompletionForm();

    setupReplacementButton();

}


/* =====================================================
   INITIALIZE AFTER PAGE LOAD
===================================================== */

if (
    document.readyState === 'loading'
) {

    document.addEventListener(
        'DOMContentLoaded',
        initializeCompletionModal
    );

} else {

    initializeCompletionModal();

}