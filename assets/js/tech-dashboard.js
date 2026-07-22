let adminChatInterval = null;
let adminLastMessageCount = 0;

document.addEventListener('DOMContentLoaded', () => {
    // Initial Load: Daily/Today ang default
    fetchTechStats('daily');

    // --- FILTER ELEMENTS ---
    const dateFilter = document.getElementById('techDateFilter');
    const customRange = document.getElementById('techCustomRange');
    const applyBtn = document.getElementById('applyTechFilter');

    // --- TOGGLE LOGIC ---
    if (dateFilter) {
        dateFilter.addEventListener('change', function() {
            console.log("Selected Filter:", this.value); // Debugger para makita mo sa Console
            
            if (this.value === 'custom') {
                // Pinipilit nating lumabas gamit ang inline style
                customRange.style.setProperty('display', 'flex', 'important');
            } else {
                customRange.style.setProperty('display', 'none', 'important');
                fetchTechStats(this.value);
            }
        });
    }

    if (applyBtn) {
        applyBtn.addEventListener('click', () => {
            const start = document.getElementById('techStartDate').value;
            const end = document.getElementById('techEndDate').value;
            
            if (start && end) {
                fetchTechStats('custom', start, end);
            } else {
                alert("Please select both start and end dates.");
            }
        });
    }

    // --- EXISTING ADMIN CHAT LOGIC ---
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

async function fetchTechStats(filterType = 'all', start = '', end = '') {
    try {
        let url = `../backend/technician/get_dashboard_stats.php?filter=${filterType}`;
        if (filterType === 'custom') {
            url += `&startDate=${start}&endDate=${end}`;
        }

        const response = await fetch(url);
        const data = await response.json();

        if (data.error) { console.error(data.error); return; }

        const labelJobs = document.getElementById('label-jobs');
        const labelEarnings = document.getElementById('label-earnings');
        
        const filterNames = {
            'all': 'All Time',
            'daily': 'Today',
            'weekly': 'This Week',
            'monthly': 'This Month',
            'custom': 'Custom Range'
        };

        const currentFilterName = filterNames[filterType] || 'Today';
        if(labelJobs) labelJobs.innerText = `Jobs (${currentFilterName})`;
        if(labelEarnings) labelEarnings.innerText = `Earnings (${currentFilterName})`;

        document.getElementById('stat-jobs-today').innerText = data.jobs_today;
        document.getElementById('stat-completed').innerText = data.completed_jobs;
        
        const earningsValue = parseFloat(data.earnings_today).toLocaleString('en-US', {minimumFractionDigits: 2});
        document.getElementById('stat-earnings').innerText = `₱${earningsValue}`;

        const rating = data.avg_rating ? parseFloat(data.avg_rating).toFixed(1) : '0.0';
        document.getElementById('stat-rating').innerText = `${rating} ⭐`;

    } catch (e) { console.error("Error loading tech dashboard stats:", e); }
}

/* --- ADMIN SUPPORT CHAT LOGIC --- */
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
        
        if(messages && messages.length !== adminLastMessageCount) {
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