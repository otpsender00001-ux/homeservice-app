let chatInterval = null; 
let currentChatBookingId = null;
let lastMessageCount = 0;

document.addEventListener('DOMContentLoaded', () => {
    loadBookings();

    // Search function logic
    document.getElementById('search-service').addEventListener('input', function(e) {
        const term = e.target.value.toLowerCase();
        const cards = document.querySelectorAll('.booking-card');
        cards.forEach(card => {
            const text = card.querySelector('h4').innerText.toLowerCase();
            card.style.display = text.includes(term) ? 'flex' : 'none';
        });
    });

    // Filter by status
    const filterStatus = document.getElementById('filter-status');
    if (filterStatus) { filterStatus.addEventListener('change', loadBookings); }
});

async function loadBookings() {
    const container = document.getElementById('booking-list');
    const statusSelect = document.getElementById('filter-status');
    const status = statusSelect ? statusSelect.value : 'all';
    
    container.innerHTML = "<p style='text-align:center;'>Loading your bookings...</p>";

    try {
        const response = await fetch(`../backend/bookings/get_user_bookings.php?status=${status}`);
        
        if (!response.ok) throw new Error(`HTTP Error! Status: ${response.status}`);
        const data = await response.json();

        if (data.error) {
            container.innerHTML = `<p style="color:red; text-align:center;">Database Error: ${data.error}</p>`;
            return;
        }

        if (!data || data.length === 0) {
            container.innerHTML = `<div style="text-align:center; padding:50px; color:#999;">No ${status !== 'all' ? status : ''} bookings found.</div>`;
            return;
        }

        container.innerHTML = "";
        data.forEach(b => {
            const statusColors = { 'pending': '#ffc107', 'accepted': '#17a2b8', 'in_progress': '#007bff', 'completed': '#28a745', 'cancelled': '#dc3545' };
            const badgeColor = statusColors[b.status] || '#6c757d';

            // RATING, CHAT, AT BAGONG CANCEL LOGIC
            let actionButton = '';
            let chatBtn = '';
            let cancelBtn = '';

            if (b.status === 'accepted' || b.status === 'in_progress') {
                chatBtn = `<button onclick="openChatModal(${b.id}, '${b.tech_name}')" class="btn-chat">💬 Chat Tech</button>`;
            }

            // Lalabas lang ang Cancel button kapag pending o accepted pa lang ang booking
            if (b.status === 'pending' || b.status === 'accepted') {
                cancelBtn = `<button onclick="cancelBooking(${b.id})" class="btn-cancel" style="background:#dc3545; color:#fff; border:none; padding:8px 12px; border-radius:5px; cursor:pointer; margin-top:5px; font-size:12px;"><i class="fas fa-times"></i> Cancel Booking</button>`;
            }
            
            if (b.status === 'in_progress') {
                actionButton = `${chatBtn} <br> <a href="user-track-tech.html?id=${b.id}" class="btn-track"><i class="fas fa-map-marker-alt"></i> Track Tech</a>`;
            } else if (b.status === 'accepted') {
                actionButton = `${chatBtn} <br> ${cancelBtn}`;
            } else if (b.status === 'pending') {
                actionButton = cancelBtn; // Cancel button lang ang ipapakita kung pending
            } else if (b.status === 'completed') {
                if (b.is_rated == 0) {
                    actionButton = `<button onclick="openRateModal(${b.id}, '${b.tech_name}')" class="btn-rate">⭐ Rate Now</button>`;
                } else {
                    let starIcons = '⭐'.repeat(b.user_rating); 
                    actionButton = `<span style="color: #ffc107; font-weight: bold; font-size: 14px;">${starIcons} Rated</span>`;
                }
            }

            // LOGIC PARA SA TECHNICIAN DISPLAY NAME KUNG CANCELLED NA
            let techDisplayName = b.tech_name;
            if (!techDisplayName) {
                if (b.status === 'cancelled') {
                    techDisplayName = '<span style="color:#dc3545;">None (Cancelled)</span>';
                } else {
                    techDisplayName = 'Assigning...';
                }
            }

            container.innerHTML += `
                <div class="booking-card" style="display:flex; border:1px solid #eee; padding:15px; border-radius:10px; margin-bottom:12px; background:#fff; align-items:center; gap:15px; transition: transform 0.2s; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                    <div style="font-size:24px; background:#f8f9fa; padding:15px; border-radius:8px; border: 1px solid #eee;">🛠</div>
                    <div style="flex:1;">
                        <span class="badge" style="font-size:10px; padding:3px 8px; border-radius:10px; font-weight:bold; text-transform:uppercase; background:${badgeColor}; color:#fff;">
                            ${b.status.replace('_', ' ')}
                        </span>
                        <h4 style="margin:5px 0; color:#333;">${b.service}</h4>
                        <p style="font-size:12px; color:#666; margin:0;">
                            📅 <b>Date:</b> ${b.booking_date} | ⏰ <b>Time:</b> ${b.booking_time}
                        </p>
                        <small style="color:#888;">
                            <i class="fas fa-user-cog"></i> Tech: <b>${techDisplayName}</b>
                        </small>
                    </div>
                    <div style="text-align: right;">
                        ${actionButton}
                    </div>
                </div>
            `;
        });

    } catch (e) {
        console.error("Fetch Error:", e);
        container.innerHTML = `<div style="text-align:center; padding:20px;"><p style="color:red;">Failed to load bookings.</p><button onclick="loadBookings()" style="background:#eee; border:none; padding:5px 10px; border-radius:5px; cursor:pointer;">Retry</button></div>`;
    }
}

/* =====================
❌ CANCEL BOOKING LOGIC (BAGONG DAGDAG)
===================== */
async function cancelBooking(bookingId) {
    if (!confirm("Are you sure you want to cancel this booking? This action cannot be undone.")) return;

    const formData = new FormData();
    formData.append('booking_id', bookingId);

    try {
        const res = await fetch('../backend/bookings/cancel_booking.php', { method: 'POST', body: formData });
        const data = await res.json();
        
        if (data.success) {
            alert('✅ Booking cancelled successfully.');
            loadBookings(); // I-reload ang listahan para mawala ang cancel button at magbago ang status
        } else {
            alert('Error cancelling booking: ' + data.error);
        }
    } catch (err) {
        console.error("Error cancelling:", err);
        alert('A network error occurred while cancelling.');
    }
}

/* =====================
⭐ RATING MODAL LOGIC 
===================== */
function openRateModal(bookingId, techName) {
    document.getElementById('rate-booking-id').value = bookingId;
    document.getElementById('rate-tech-name').innerText = `Technician: ${techName}`;
    document.getElementById('rateModal').style.display = 'flex';
}

function closeRateModal() {
    document.getElementById('rateModal').style.display = 'none';
    document.getElementById('ratingForm').reset();
}

document.getElementById('ratingForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const bookingId = document.getElementById('rate-booking-id').value;
    const rating = document.querySelector('input[name="rating"]:checked').value;
    const comment = document.getElementById('rate-comment').value;

    const formData = new FormData();
    formData.append('booking_id', bookingId);
    formData.append('rating', rating);
    formData.append('comment', comment);

    try {
        const res = await fetch('../backend/bookings/submit_review.php', { method: 'POST', body: formData });
        const data = await res.json();
        
        if(data.success) {
            alert('⭐ Thank you for your feedback!');
            closeRateModal();
            loadBookings(); 
        } else { alert('Error submitting review: ' + data.error); }
    } catch (err) { console.error("Error rating:", err); }
});

/* =====================
💬 LIVE CHAT LOGIC 
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