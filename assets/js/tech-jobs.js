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
                actionHtml = `${chatBtn} <button class="action-btn btn-complete" onclick="completeJob(${job.id})">✅ Finish Job</button>`;
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
    // TRANSLATED TO ENGLISH
    if (confirm("Start travel? Your location will now be tracked by the Admin and the User.")) {
        await updateStatus(bookingId, 'in_progress');
        startTrackingLogic();
        alert("GPS Tracking Started! You are now marked as on the way.");
    }
}

async function completeJob(bookingId) {
    // TRANSLATED TO ENGLISH
    if (confirm("Is the service complete? GPS tracking will now be turned off.")) {
        await updateStatus(bookingId, 'completed');
        alert("Job Completed! GPS Tracking turned off.");
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