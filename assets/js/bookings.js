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


    // =========================
    // YOUR EXISTING BOOKINGS JS
    // =========================

    const searchInput = document.getElementById('search-customer');
    const filterStatus = document.getElementById('filter-status');

    // Initial load
    fetchBookings();

    // Event listeners para sa Search at Filter
    if (searchInput) searchInput.addEventListener('input', fetchBookings);
    if (filterStatus) filterStatus.addEventListener('change', fetchBookings);

    // --- Slot Management Initialization ---
    if (document.getElementById('slot-table-body')) {
        fetchAdminSlots();
    }

    // --- User Side Date Picker Listener ---
    const userDateInput = document.getElementById('booking-date');

    if (userDateInput) {
        userDateInput.addEventListener('change', function() {
            fetchAvailableSlotsForUser(this.value);
        });
    }

    // ✨ Search Filter para sa Modal List
    const techSearchInput = document.getElementById('tech-search-input');

    if (techSearchInput) {
        techSearchInput.addEventListener('input', function() {

            const filter = this.value.toLowerCase();
            const items = document.querySelectorAll('.tech-item');

            items.forEach(item => {
                const text = item.textContent.toLowerCase();

                item.style.display =
                    text.includes(filter) ? 'flex' : 'none';
            });

        });
    }

});

async function fetchBookings() {
    const searchInput = document.getElementById('search-customer');
    const filterStatus = document.getElementById('filter-status');
    const search = searchInput ? searchInput.value : '';
    const status = filterStatus ? filterStatus.value : '';
    const tbody = document.getElementById('bookings-table-body');

    if (!tbody) return; 

    try {
        const response = await fetch(`../backend/bookings/get_all_bookings.php?search=${search}&status=${status}`);
        const data = await response.json();

        tbody.innerHTML = '';

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No bookings found.</td></tr>';
            return;
        }

        data.forEach(booking => {
            const actionBtn = booking.status === 'pending'
    ? `
        <div class="booking-actions">
            <button
                class="btn-accept"
                onclick="openAssignModal(${booking.id}, '${booking.service_name}')">
                Accept
            </button>

            <button
                class="btn-cancel-booking"
                onclick="openCancelModal(${booking.id})">
                Cancel
            </button>
        </div>
      `
    : `<small style="color:gray">Processed</small>`;

            const row = `
                <tr>
                    <td>${booking.customer || 'Unknown'}</td>
                    <td>${booking.service_name || 'N/A'}</td>
                    <td>${formatDate(booking.booking_date)} <br> <small>${formatTime(booking.time_start)}</small></td>
                    <td>${booking.technician || '<i>Not Assigned</i>'}</td>
                    <td><span class="badge ${getStatusClass(booking.status)}">${capitalize(booking.status)}</span></td>
                    <td>${actionBtn}</td>
                </tr>
            `;
            tbody.insertAdjacentHTML('beforeend', row);
        });
    } catch (error) {
        console.error('Error:', error);
    }
}

// --- MODAL FUNCTIONS (Na-upgrade to Searchable List) ---

async function openAssignModal(bookingId, serviceName) {
    document.getElementById('modal-booking-id').value = bookingId;
    document.getElementById('modal-service-name').innerText = "Service Needed: " + serviceName;
    document.getElementById('tech-search-input').value = ''; // Reset search bar
    document.getElementById('selected-tech-id').value = ''; // Reset selected ID
    document.getElementById('btn-confirm-assign').disabled = true; // Disable confirm btn initially
    
    const listBox = document.getElementById('tech-list-box');
    listBox.innerHTML = '<div style="padding: 10px; color: gray; text-align: center; font-size: 13px;">Searching available specialists...</div>';
    
    try {
        const resp = await fetch(`../backend/bookings/get_available_techs.php?service=${encodeURIComponent(serviceName)}`);
        const techs = await resp.json();
        
        listBox.innerHTML = ''; 
        
        if(techs.length === 0) {
            listBox.innerHTML = '<div style="padding: 10px; color: red; text-align: center; font-size: 13px;">No specialists available for this service.</div>';
        } else {
            techs.forEach(t => {
                const item = document.createElement('div');
                item.className = 'tech-item';
                item.innerHTML = `<span>${t.full_name}</span> <span style="font-size: 10px; background:#ddd; padding: 2px 5px; border-radius: 4px;">Available</span>`;
                item.onclick = function() {
                    // Remove highlight from all
                    document.querySelectorAll('.tech-item').forEach(el => el.classList.remove('selected'));
                    // Add highlight to clicked
                    item.classList.add('selected');
                    // Set value
                    document.getElementById('selected-tech-id').value = t.id;
                    document.getElementById('btn-confirm-assign').disabled = false;
                };
                listBox.appendChild(item);
            });
        }
    } catch (error) {
        console.error('Error fetching techs:', error);
        listBox.innerHTML = '<div style="padding: 10px; color: red; text-align: center; font-size: 13px;">Error loading technicians</div>';
    }
    
    document.getElementById('assignModal').style.display = 'flex'; // Changed to flex for proper centering
}

function closeModal() {
    document.getElementById('assignModal').style.display = 'none';
}

window.onclick = function(event) {

    const assignModal = document.getElementById('assignModal');
    const cancelModal = document.getElementById('cancelBookingModal');

    if (event.target === assignModal) {
        closeModal();
    }

    if (event.target === cancelModal) {
        closeCancelModal();
    }
}

// ✨ DAGDAG: Function para ma-cancel ang booking
// =========================
// CANCEL BOOKING MODAL
// =========================

let cancelBookingId = null;

function openCancelModal(bookingId) {

    cancelBookingId = bookingId;

    // Clear previous reason
    const reasonInput = document.getElementById('cancel-reason');

    if (reasonInput) {
        reasonInput.value = '';
    }

    // Reset buttons
    const yesButton = document.querySelector('.btn-yes-cancel');
    const noButton = document.querySelector('.btn-no-cancel');

    if (yesButton) {
        yesButton.disabled = false;
        yesButton.innerText = 'Yes, Cancel';
    }

    if (noButton) {
        noButton.disabled = false;
    }

    document.getElementById('cancelBookingModal').style.display = 'flex';
}

function closeCancelModal() {

    document.getElementById('cancelBookingModal').style.display = 'none';

    const reasonInput = document.getElementById('cancel-reason');

    if (reasonInput) {
        reasonInput.value = '';
    }

    cancelBookingId = null;
}

async function confirmCancelBooking() {

    if (!cancelBookingId) return;

    const bookingId = cancelBookingId;

    const reasonInput = document.getElementById('cancel-reason');
    const reason = reasonInput ? reasonInput.value.trim() : '';

    // =========================
    // CHECK REASON
    // =========================

    if (!reason) {

        alert("Please enter a reason for cancelling this booking.");

        if (reasonInput) {
            reasonInput.focus();
        }

        return;
    }


    // =========================
    // PREPARE FORM DATA
    // =========================

    const formData = new FormData();

    formData.append('booking_id', bookingId);
    formData.append('action', 'cancel');
    formData.append('reason', reason);


    // =========================
    // DISABLE BUTTONS
    // =========================

    const yesButton = document.querySelector('.btn-yes-cancel');
    const noButton = document.querySelector('.btn-no-cancel');

    yesButton.disabled = true;
    noButton.disabled = true;

    yesButton.innerText = 'Cancelling...';


    // =========================
    // SEND TO BACKEND
    // =========================

    try {

        const resp = await fetch(
            '../backend/bookings/assign_technician.php',
            {
                method: 'POST',
                body: formData
            }
        );

        const res = await resp.json();


        // =========================
        // SUCCESS
        // =========================

        if (res.success) {

            closeCancelModal();

            fetchBookings();

        }

        // =========================
        // ERROR
        // =========================

        else {

            alert(
                res.message ||
                "Failed to cancel booking."
            );

            yesButton.disabled = false;
            noButton.disabled = false;

            yesButton.innerText = 'Yes, Cancel';
        }

    }

    catch (error) {

        console.error(
            'Cancel Error:',
            error
        );

        alert(
            "Something went wrong while cancelling the booking."
        );

        yesButton.disabled = false;
        noButton.disabled = false;

        yesButton.innerText = 'Yes, Cancel';
    }
}

const assignForm = document.getElementById('assignForm');
if (assignForm) {
    assignForm.onsubmit = async (e) => {
        e.preventDefault();
        const bookingId = document.getElementById('modal-booking-id').value;
        const techId = document.getElementById('selected-tech-id').value;

        if(!techId) {
            alert("Please select a technician from the list first.");
            return;
        }

        const formData = new FormData();
        formData.append('booking_id', bookingId);
        formData.append('technician_id', techId);
        formData.append('action', 'assign'); // Idinagdag para alam ng backend ang gagawin

        try {
            const resp = await fetch('../backend/bookings/assign_technician.php', { method: 'POST', body: formData });
            const res = await resp.json();
            if(res.success) {
                closeModal();
                fetchBookings(); 
            } else {
                alert("Failed to assign technician. Please try again.");
            }
        } catch (error) { console.error('Submit Error:', error); }
    };
}

// --- ADMIN SLOT MANAGEMENT FUNCTIONS ---

async function fetchAdminSlots() {
    const tbody = document.getElementById('slot-table-body');
    if (!tbody) return;

    try {
        const response = await fetch('../backend/admin/manage_slots_logic.php?action=fetch');
        const slots = await response.json();

        tbody.innerHTML = '';
        slots.forEach(slot => {
            const row = `
                <tr>
                    <td><strong>${formatTime(slot.time_start)} - ${formatTime(slot.time_end)}</strong></td>
                    <td>${slot.max_capacity} Users</td>
                    <td><button class="btn-delete" onclick="deleteSlot(${slot.id})">Remove</button></td>
                </tr>
            `;
            tbody.insertAdjacentHTML('beforeend', row);
        });
    } catch (error) { console.error('Slot Fetch Error:', error); }
}

async function addSlot() {
    const start = document.getElementById('start-time').value;
    const end = document.getElementById('end-time').value;
    const capacity = document.getElementById('slot-capacity').value;

    if (!start || !end) { alert("Please set both start and end times."); return; }

    const formData = new FormData();
    formData.append('time_start', start);
    formData.append('time_end', end);
    formData.append('max_capacity', capacity);

    const response = await fetch('../backend/admin/save_slot.php', { method: 'POST', body: formData });
    const res = await response.json();
    if (res.status === 'success') { fetchAdminSlots(); alert("New slot added!"); } 
    else { alert(res.message || "Error saving slot."); }
}

async function deleteSlot(id) {
    if (confirm("Are you sure you want to remove this time slot?")) {
        await fetch(`../backend/admin/manage_slots_logic.php?action=delete&id=${id}`);
        fetchAdminSlots();
    }
}

// --- USER SIDE SLOT PICKER LOGIC ---

async function fetchAvailableSlotsForUser(date) {
    const container = document.getElementById('available-slots-container');
    if (!container) return;

    container.innerHTML = '<p>Checking availability...</p>';

    try {
        const response = await fetch(`../backend/bookings/get_time_slots.php?date=${date}`);
        const slots = await response.json();
        container.innerHTML = '';

        if (slots.length === 0) {
            container.innerHTML = '<p style="color:red;">Admin hasn\'t set any time slots yet.</p>';
            return;
        }

        slots.forEach(slot => {
            const isFull = !slot.available;
            const btn = document.createElement('button');
            btn.type = "button";
            btn.className = isFull ? "slot-btn full" : "slot-btn";
            btn.disabled = isFull;
            
            btn.innerHTML = `<strong>${slot.display_time}</strong><br><small>${isFull ? 'FULL' : slot.slots_left + ' slots available'}</small>`;

            btn.onclick = function() {
                const startInput = document.getElementById('selected-time-start');
                const endInput = document.getElementById('selected-time-end');
                
                if (startInput) startInput.value = slot.time_start;
                if (endInput) endInput.value = slot.time_end;

                document.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
            };
            container.appendChild(btn);
        });
    } catch (error) {
        console.error('Error fetching user slots:', error);
        container.innerHTML = '<p>Error loading slots.</p>';
    }
}

// --- HELPER FUNCTIONS ---

function getStatusClass(status) {
    const statusMap = {
        'pending': 'badge-orange',
        'completed': 'badge-green',
        'cancelled': 'badge-red',
        'in_progress': 'badge-blue',
        'accepted': 'badge-blue'
    };
    return statusMap[status] || '';
}

function formatDate(dateStr) { return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }

function formatTime(timeStr) {
    if (!timeStr) return 'N/A';
    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const formattedHours = h % 12 || 12;
    return `${formattedHours}:${minutes} ${ampm}`;
}

function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).replace('_', ' ');
}