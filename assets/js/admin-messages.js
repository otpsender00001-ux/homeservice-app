let currentChatUserId = null;
let currentChatName = "";
let chatInterval = null;
let lastMessageCount = 0;

document.addEventListener('DOMContentLoaded', () => {
    loadContacts();
    // Auto refresh contacts list every 5 seconds
    setInterval(loadContacts, 5000); 
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
            const roleClass = c.role === 'user' ? 'role-user' : 'role-technician';
            const activeClass = (currentChatUserId == c.id) ? 'active' : '';
            
            html += `
                <div class="contact-card ${activeClass}" onclick="openChat(${c.id}, '${c.full_name}')">
                    <span class="contact-name">${c.full_name}</span>
                    <div><span class="contact-role ${roleClass}">${c.role}</span></div>
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

    loadMessages();
    if(chatInterval) clearInterval(chatInterval);
    chatInterval = setInterval(loadMessages, 2000); // Live poll per user
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