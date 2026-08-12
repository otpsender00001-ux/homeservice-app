let adminChatInterval = null;
let adminLastMessageCount = 0;

document.addEventListener('DOMContentLoaded', () => {
    loadUser();
    loadDashboard();
    setInterval(loadDashboard, 3000);

    // =======================
// LOGOUT MODAL
// =======================

const logoutBtn =
    document.getElementById("logout-btn");

const logoutModal =
    document.getElementById("logout-modal");

const cancelLogout =
    document.getElementById("cancel-logout");

const confirmLogout =
    document.getElementById("confirm-logout");


if (logoutBtn && logoutModal) {

    logoutBtn.addEventListener("click", function(e) {

        e.preventDefault();

        logoutModal.classList.add("show");

    });

}


if (cancelLogout) {

    cancelLogout.addEventListener("click", function() {

        logoutModal.classList.remove("show");

    });

}


if (confirmLogout) {

    confirmLogout.addEventListener("click", function() {

        confirmLogout.disabled = true;
        cancelLogout.disabled = true;

        confirmLogout.innerHTML = `
            <span class="spinner"></span>
            Logging out...
        `;

        setTimeout(() => {

            window.location.href =
                "../backend/auth/logout.php";

        }, 1200);

    });

}

    // 🛠️ FIX: Inilagay natin sa loob ng DOMContentLoaded para siguradong babasahin ng browser!
    const adminChatForm = document.getElementById('adminChatForm');
    if (adminChatForm) {
        adminChatForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const input = document.getElementById('admin-chat-input');
            const imageInput = document.getElementById('admin-chat-image');
            
            const msg = input.value.trim();
            const imageFile = imageInput.files[0];

            if(!msg && !imageFile) return;

            const fd = new FormData();
            fd.append('message', msg);
            if(imageFile) { fd.append('image', imageFile); }

            input.value = '';
            imageInput.value = '';
            document.getElementById('admin-chat-img-btn').style.background = '#eee';
            document.getElementById('admin-chat-img-btn').style.color = '#333';

            try {
                await fetch('../backend/chat/send_admin_message.php', { method: 'POST', body: fd });
                loadAdminMessages(); 
            } catch(e) { console.error(e); }
        });
    }
});

async function loadUser() {
    try {
        const res = await fetch('../backend/users/get_current_user.php');
        const user = await res.json();
        if (user.full_name) {
            const firstName = user.full_name.split(" ")[0];
            document.getElementById('welcome-text').innerText = `Hi ${firstName} 👋`;
        }
    } catch (e) { console.error(e); }
}

async function loadDashboard() {
    try {
        const res = await fetch('../backend/bookings/get_dashboard_active_booking.php');
        const data = await res.json();
        const trackBtn = document.getElementById('track-btn');
        const serviceStatus = document.getElementById('service-status');

        if (!data || !data.service) {
            document.getElementById('service-name').innerText = "None";
            document.getElementById('service-status').innerText = "No active";
            serviceStatus.className = "status-badge status-none"; 
            document.getElementById('tech-name').innerText = "Not Assigned";
            document.getElementById('tech-specialty').innerText = "---";
            
            if(trackBtn) {
                trackBtn.href = "#";
                trackBtn.className = "action-card disabled-btn";
                trackBtn.innerHTML = "📍 Track Now (Unavailable)";
            }
            return;
        }

        document.getElementById('service-name').innerText = data.service;
        let statusText = data.status.replace('_', ' ');
        document.getElementById('service-status').innerText = statusText.charAt(0).toUpperCase() + statusText.slice(1);
        
        if (data.status === 'pending') { serviceStatus.className = "status-badge status-pending"; } 
        else if (data.status === 'accepted' || data.status === 'in_progress') { serviceStatus.className = "status-badge status-active"; }

        document.getElementById('tech-name').innerText = data.tech_name || "Not Assigned";
        document.getElementById('tech-specialty').innerText = data.specialization || "---";

        if(trackBtn) {
            if (data.status === 'accepted' || data.status === 'in_progress') {
                trackBtn.href = "user-track-tech.html";
                trackBtn.className = "action-card active-track-btn";
                trackBtn.innerHTML = "📍 Track Technician Live";
            } else {
                trackBtn.href = "#";
                trackBtn.className = "action-card disabled-btn";
                trackBtn.innerHTML = "📍 Waiting for Assignment";
            }
        }
    } catch (e) { console.error(e); }
}

/* =====================
💬 ADMIN SUPPORT CHAT LOGIC
===================== */
function openAdminChat() {
    document.getElementById('adminChatModal').style.display = 'flex';
    loadAdminMessages();
    adminChatInterval = setInterval(loadAdminMessages, 2000); 
}

function closeAdminChat() {
    document.getElementById('adminChatModal').style.display = 'none';
    clearInterval(adminChatInterval);
    adminLastMessageCount = 0;
}

async function loadAdminMessages() {
    try {
        const res = await fetch(`../backend/chat/get_admin_messages.php`);
        const messages = await res.json();
        const chatBox = document.getElementById('admin-chat-messages');
        
        if(messages.length !== adminLastMessageCount) {
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
            adminLastMessageCount = messages.length;
        }
    } catch(e) { console.error(e); }
}