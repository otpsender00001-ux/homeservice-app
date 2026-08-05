
document.addEventListener('DOMContentLoaded', function() {
    fetchStats();

    const logoutBtn = document.getElementById("logout-btn");
const logoutModal = document.getElementById("logout-modal");

const cancelLogout = document.getElementById("cancel-logout");
const confirmLogout = document.getElementById("confirm-logout");

logoutBtn.addEventListener("click", function(e){
    e.preventDefault();

    console.log("Logout button clicked!");

    logoutModal.classList.add("show");
});

cancelLogout.addEventListener("click", function(){
    logoutModal.classList.remove("show");
});

confirmLogout.addEventListener("click", function () {

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

// Close when clicking outside the popup


    // Auto-compute kapag binago mo ang number sa textbox
    const laborInput = document.getElementById('labor-percentage');
    if(laborInput) {
        laborInput.addEventListener('input', fetchStats);
    }

    // Date Filter logic
    const dateFilter = document.getElementById('date-filter');
    const customContainer = document.getElementById('custom-date-container');
    const applyBtn = document.getElementById('apply-filter-btn');

    if(dateFilter) {
        dateFilter.addEventListener('change', function() {
            if (this.value === 'custom') {
                customContainer.style.display = 'flex';
            } else {
                customContainer.style.display = 'none';
                fetchStats();
            }
        });
    }

    if(applyBtn) {
        applyBtn.addEventListener('click', fetchStats);
    }
});

async function fetchStats() {
    try {
        const filter = document.getElementById('date-filter') ? document.getElementById('date-filter').value : 'all';
        const startDate = document.getElementById('start-date') ? document.getElementById('start-date').value : '';
        const endDate = document.getElementById('end-date') ? document.getElementById('end-date').value : '';

        let url = `../backend/admin/get_dashboard_stats.php?filter=${filter}&start_date=${startDate}&end_date=${endDate}`;

        const response = await fetch(url);
        const data = await response.json();

        // 1. Kunin ang raw revenue
        let rawRevenueStr = String(data.total_revenue).replace(/,/g, '');
        const rawRevenue = parseFloat(rawRevenueStr) || 0;

        // 2. Kunin ang LOCKED Labor Cost at Profit mula sa Backend
        let rawLaborStr = String(data.labor_cost).replace(/,/g, '');
        const laborCostLocked = parseFloat(rawLaborStr) || 0;
        
        let rawProfitStr = String(data.net_profit).replace(/,/g, '');
        const netProfitLocked = parseFloat(rawProfitStr) || 0;

        // Update Stats Cards
        document.getElementById('total-bookings').textContent = (data.total_bookings || 0).toLocaleString();
        document.getElementById('total-revenue').textContent = '₱' + rawRevenue.toLocaleString(undefined, {minimumFractionDigits: 2});
        document.getElementById('pending-tasks').textContent = data.pending_tasks || 0;
        document.getElementById('active-techs').textContent = data.active_techs || 0;
        
        const laborEl = document.getElementById('labor-cost');
        const netEl = document.getElementById('net-profit');
        
        // ✨ Dito na natin ilalabas yung permanenteng records galing database ✨
        if(laborEl) laborEl.textContent = '₱' + laborCostLocked.toLocaleString(undefined, {minimumFractionDigits: 2});
        if(netEl) netEl.textContent = '₱' + netProfitLocked.toLocaleString(undefined, {minimumFractionDigits: 2});

        // Update Recent Bookings Table
        const tableBody = document.getElementById('recent-bookings-table');
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

    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

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

