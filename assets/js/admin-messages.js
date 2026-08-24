let currentChatUserId = null;
let currentChatName = "";
let chatInterval = null;
let lastMessageCount = 0;
let inboxNotificationInterval = null;

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

        // Close when clicking outside the modal
        logoutModal.addEventListener("click", function(e) {
            if (e.target === logoutModal) {
                logoutModal.classList.remove("show");
            }
        });
    }
    
    loadContacts();
    // Auto refresh contacts list every 5 seconds
    setInterval(loadContacts, 5000); 

    inboxNotificationInterval = setInterval(updateAdminInboxBadge, 5000);
});

async function loadContacts() {
    try {
        const res = await fetch('../backend/chat/get_admin_contacts.php');
        const contacts = await res.json();
        const list = document.getElementById('contacts-list');
        
        if(contacts.length === 0) {
            list.innerHTML = `<div style="padding: 20px; text-align: center; color: #999;">No messages yet.</div>`;
            return;
        }

        let html = '';
        contacts.forEach(c => {

    const roleClass =
        c.role === 'user'
            ? 'role-user'
            : 'role-technician';

    const activeClass =
        (currentChatUserId == c.id)
            ? 'active'
            : '';

    const unreadCount =
        parseInt(c.unread_count) || 0;

    const unreadBadge =
        unreadCount > 0
            ? `<span class="contact-unread-badge">
                    ${unreadCount > 99 ? '99+' : unreadCount}
               </span>`
            : '';

    html += `
        <div
            class="contact-card ${activeClass}"
            onclick="openChat(${c.id}, '${c.full_name}')"
        >

            <div class="contact-top-row">

                <span class="contact-name">
                    ${c.full_name}
                </span>

                ${unreadBadge}

            </div>

            <div>
                <span class="contact-role ${roleClass}">
                    ${c.role}
                </span>
            </div>

        </div>
    `;
});
        list.innerHTML = html;
    } catch (e) { console.error("Error loading contacts:", e); }
}

function openChat(userId, name) {
    currentChatUserId = userId;
    currentChatName = name;
    lastMessageCount = 0;
    
    // Set active class visually sa sidebar
    document.querySelectorAll('.contact-card').forEach(c => c.classList.remove('active'));
    event.currentTarget.classList.add('active');

    // Build the chat UI sa right side
    const chatArea = document.getElementById('chat-area-container');
    chatArea.innerHTML = `
        <div class="chat-header">
            <h3 style="margin:0;">Chat with: <span style="color:#0084ff;">${name}</span></h3>
        </div>
        <div id="admin-chat-messages" class="chat-box">
            <div style="text-align:center; padding:20px; color:#999;">Loading messages...</div>
        </div>
        <form id="adminChatForm" class="chat-input-area">
            <input type="file" id="admin-chat-image" accept="image/*" style="display:none;" onchange="document.getElementById('admin-chat-img-btn').style.background='#28a745'; document.getElementById('admin-chat-img-btn').style.color='white';">
            <button type="button" id="admin-chat-img-btn" onclick="document.getElementById('admin-chat-image').click()" style="background:#eee; border:none; padding:10px 15px; border-radius:20px; cursor:pointer; transition:0.3s;">📷</button>
            <input type="text" id="admin-chat-input" class="chat-input" placeholder="Type a reply..." autocomplete="off">
            <button type="submit" class="btn-send">Send Reply</button>
        </form>
    `;

    // Attach submit event sa bagong form
    document.getElementById('adminChatForm').addEventListener('submit', sendAdminMessage);

    markMessagesAsRead(currentChatUserId);

loadMessages();

if (chatInterval) {
    clearInterval(chatInterval);
}

chatInterval = setInterval(loadMessages, 2000);
}

async function loadMessages() {
    if(!currentChatUserId) return;
    try {
        const res = await fetch(`../backend/chat/admin_get_messages.php?user_id=${currentChatUserId}`);
        const messages = await res.json();
        const chatBox = document.getElementById('admin-chat-messages');
        
        // 🛠️ FIX: Pag walang laman ang chat history, aalisin natin ang Loading at papalitan ng "No messages yet."
        if (messages.length === 0) {
            chatBox.innerHTML = '<div style="text-align:center; padding:20px; color:#999;">No messages yet. Start chatting!</div>';
            lastMessageCount = 0;
            return;
        }

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

async function sendAdminMessage(e) {
    e.preventDefault();
    const input = document.getElementById('admin-chat-input');
    const imageInput = document.getElementById('admin-chat-image');
    
    const msg = input.value.trim();
    const imageFile = imageInput.files[0];

    if(!msg && !imageFile) return;

    const fd = new FormData();
    fd.append('receiver_id', currentChatUserId);
    fd.append('message', msg);
    if(imageFile) { fd.append('image', imageFile); }

    input.value = '';
    imageInput.value = '';
    document.getElementById('admin-chat-img-btn').style.background = '#eee';
    document.getElementById('admin-chat-img-btn').style.color = '#333';

    try {
        await fetch('../backend/chat/admin_send_message.php', { method: 'POST', body: fd });
        loadMessages(); 
    } catch(e) { console.error(e); }
}

// =====================================================
// UPDATE TOTAL ADMIN INBOX BADGE
// =====================================================

async function updateAdminInboxBadge() {

    const badge = document.getElementById('admin-inbox-badge');

    if (!badge) return;

    try {

        const response = await fetch(
            '../backend/chat/get_admin_unread_count.php',
            {
                cache: 'no-store'
            }
        );

        const data = await response.json();

        if (!data.success) {
            badge.style.display = 'none';
            return;
        }

        const count = parseInt(data.count) || 0;

        if (count > 0) {

            badge.textContent = count > 99 ? '99+' : count;
            badge.style.display = 'inline-flex';

        } else {

            badge.textContent = '0';
            badge.style.display = 'none';

        }

    } catch (error) {

        console.error(
            'Error loading Inbox notification:',
            error
        );

    }
}

// =====================================================
// MARK ADMIN CHAT MESSAGES AS READ
// =====================================================

async function markMessagesAsRead(userId) {

    if (!userId) return;

    try {

        const formData = new FormData();

        formData.append('user_id', userId);

        const response = await fetch(
            '../backend/chat/mark_admin_messages_read.php',
            {
                method: 'POST',
                body: formData
            }
        );

        const data = await response.json();

        if (!data.success) {

            console.error(
                'Failed to mark messages as read:',
                data.message
            );

            return;
        }

        // Immediately update the total Inbox badge
        updateAdminInboxBadge();

        // Refresh contacts so the person's badge disappears
        loadContacts();

    } catch (error) {

        console.error(
            'Error marking messages as read:',
            error
        );

    }
}