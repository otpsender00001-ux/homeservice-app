let currentDailyRate = 800;
let pendingDailyRate = 800;

document.addEventListener('DOMContentLoaded', function() {
    fetchStats();

    // --- Modal Event Listeners ---
    const btnOpenLaborModal = document.getElementById('btnOpenLaborModal');
    if (btnOpenLaborModal) {
        btnOpenLaborModal.addEventListener('click', openLaborModal);
    }

    const btnCancelLaborModal = document.getElementById('btnCancelLaborModal');
    if (btnCancelLaborModal) {
        btnCancelLaborModal.addEventListener('click', closeLaborModal);
    }

    const btnProceedConfirmation = document.getElementById('btnProceedConfirmation');
    if (btnProceedConfirmation) {
        btnProceedConfirmation.addEventListener('click', proceedToConfirmation);
    }

    const btnCancelConfirmModal = document.getElementById('btnCancelConfirmModal');
    if (btnCancelConfirmModal) {
        btnCancelConfirmModal.addEventListener('click', closeConfirmModal);
    }

    const btnActivateNow = document.getElementById('btnActivateNow');
    if (btnActivateNow) {
        btnActivateNow.addEventListener('click', executeActivateNow);
    }

    // --- Logout Modal Handlers ---
    const logoutBtn = document.getElementById("logout-btn");
    const logoutModal = document.getElementById("logout-modal");
    const cancelLogout = document.getElementById("cancel-logout");
    const confirmLogout = document.getElementById("confirm-logout");

    if (logoutBtn) {
        logoutBtn.addEventListener("click", function(e){
            e.preventDefault();
            if (logoutModal) {
                logoutModal.style.display = "flex";
                logoutModal.classList.add("show");
            }
        });
    }

    if (cancelLogout) {
        cancelLogout.addEventListener("click", function(){
            if (logoutModal) {
                logoutModal.style.display = "none";
                logoutModal.classList.remove("show");
            }
        });
    }

    if (confirmLogout) {
        confirmLogout.addEventListener("click", function () {
            confirmLogout.disabled = true;
            if (cancelLogout) cancelLogout.disabled = true;

            confirmLogout.innerHTML = `
                <span class="spinner"></span>
                Logging out...
            `;

            setTimeout(() => {
                window.location.href = "../backend/auth/logout.php";
            }, 1200);
        });
    }

    // --- Date Filter Logic ---
    const dateFilter = document.getElementById('date-filter');
    const customContainer = document.getElementById('custom-date-container');
    const applyBtn = document.getElementById('apply-filter-btn');

    if (dateFilter) {
        dateFilter.addEventListener('change', function() {
            if (this.value === 'custom') {
                if (customContainer) customContainer.style.display = 'flex';
            } else {
                if (customContainer) customContainer.style.display = 'none';
                fetchStats();
            }
        });
    }

    if (applyBtn) {
        applyBtn.addEventListener('click', fetchStats);
    }
});

// --- Fetch Dashboard Stats ---
async function fetchStats() {
    try {
        const filter = document.getElementById('date-filter') ? document.getElementById('date-filter').value : 'all';
        const startDate = document.getElementById('start-date') ? document.getElementById('start-date').value : '';
        const endDate = document.getElementById('end-date') ? document.getElementById('end-date').value : '';

        let url = `../backend/admin/get_dashboard_stats.php?filter=${filter}&start_date=${startDate}&end_date=${endDate}`;

        const response = await fetch(url);
        const data = await response.json();

        // Update Daily Rate UI Badge
        if (data.config) {
            currentDailyRate = parseFloat(data.config.daily_rate || 800);
            const badge = document.getElementById('activeModeBadge');
            if (badge) {
                badge.innerText = `₱${currentDailyRate.toLocaleString()}/day`;
            }
        }

        // Stats Calculations
        let rawRevenueStr = String(data.total_revenue || '0').replace(/,/g, '');
        const rawRevenue = parseFloat(rawRevenueStr) || 0;

        let rawLaborStr = String(data.labor_cost || '0').replace(/,/g, '');
        const laborCostLocked = parseFloat(rawLaborStr) || 0;
        
        let rawProfitStr = String(data.net_profit || '0').replace(/,/g, '');
        const netProfitLocked = parseFloat(rawProfitStr) || 0;

        // Update Stats Cards
        if (document.getElementById('total-bookings')) document.getElementById('total-bookings').textContent = (data.total_bookings || 0).toLocaleString();
        if (document.getElementById('total-revenue')) document.getElementById('total-revenue').textContent = '₱' + rawRevenue.toLocaleString(undefined, {minimumFractionDigits: 2});
        if (document.getElementById('pending-tasks')) document.getElementById('pending-tasks').textContent = data.pending_tasks || 0;
        if (document.getElementById('active-techs')) document.getElementById('active-techs').textContent = data.active_techs || 0;
        
        const laborEl = document.getElementById('labor-cost');
        const netEl = document.getElementById('net-profit');
        
        if (laborEl) laborEl.textContent = '₱' + laborCostLocked.toLocaleString(undefined, {minimumFractionDigits: 2});
        if (netEl) netEl.textContent = '₱' + netProfitLocked.toLocaleString(undefined, {minimumFractionDigits: 2});

        // Update Recent Bookings Table
        const tableBody = document.getElementById('recent-bookings-table');
        if (tableBody) {
            tableBody.innerHTML = ''; 

            if (!data.recent_bookings || data.recent_bookings.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No bookings found for this range.</td></tr>';
                return;
            }

            data.recent_bookings.forEach(booking => {
                const statusClass = getStatusBadge(booking.status);
                const row = `
                    <tr>
                        <td>${booking.full_name || 'N/A'}</td>
                        <td>${booking.service_name || 'Deleted Service'}</td>
                        <td>${formatDate(booking.booking_date)}</td>
                        <td>₱${parseFloat(booking.total_amount).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                        <td><span class="badge ${statusClass}">${capitalize(booking.status)}</span></td>
                    </tr>
                `;
                tableBody.innerHTML += row;
            });
        }

    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

// --- Modal Controls ---
function openLaborModal() {
    const modal = document.getElementById('laborCostSettingsModal');
    const inputDaily = document.getElementById('inputDailyRate');

    if (inputDaily) inputDaily.value = currentDailyRate;

    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('show');
    }
}

function closeLaborModal() {
    const modal = document.getElementById('laborCostSettingsModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('show');
    }
}

function proceedToConfirmation() {
    const selectedValue = parseFloat(document.getElementById('inputDailyRate')?.value || 0);

    if (isNaN(selectedValue) || selectedValue <= 0) {
        alert("Please enter a valid daily salary rate (e.g. 800).");
        return;
    }

    pendingDailyRate = selectedValue;

    const msgEl = document.getElementById('confirmEnglishMessage');
    if (msgEl) {
        msgEl.innerHTML = `You are updating the technician daily salary rate to <strong>₱${pendingDailyRate.toLocaleString()}</strong> per day.<br><br>Company net profit will be calculated by deducting this daily salary rate from total job revenues. Do you wish to confirm this change?`;
    }

    closeLaborModal();
    const confirmModal = document.getElementById('confirmSwitchModal');
    if (confirmModal) {
        confirmModal.style.display = 'flex';
        confirmModal.classList.add('show');
    }
}

function closeConfirmModal() {
    const confirmModal = document.getElementById('confirmSwitchModal');
    if (confirmModal) {
        confirmModal.style.display = 'none';
        confirmModal.classList.remove('show');
    }
}

async function executeActivateNow() {
    const btn = document.getElementById('btnActivateNow');
    if (btn) btn.disabled = true;

    try {
        const response = await fetch('../backend/admin/update_cost_mode.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ value: pendingDailyRate })
        });

        const result = await response.json();

        if (result.success) {
            closeConfirmModal();
            fetchStats();
        } else {
            alert("Error: " + (result.message || "Failed to update daily rate."));
        }
    } catch (err) {
        console.error("Save error:", err);
        alert("Server connection error while updating settings.");
    } finally {
        if (btn) btn.disabled = false;
    }
}

// --- Helpers ---
function getStatusBadge(status) {
    if(!status) return '';
    switch(status.toLowerCase()) {
        case 'completed': return 'badge-green';
        case 'pending': return 'badge-orange';
        case 'cancelled': return 'badge-red';
        case 'in_progress': return 'badge-blue';
        default: return '';
    }
}

function formatDate(dateStr) {
    if(!dateStr) return 'N/A';
    const event = new Date(dateStr);
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return event.toLocaleDateString('en-US', options);
}

function capitalize(str) {
    if(!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).replace('_', ' ');
}