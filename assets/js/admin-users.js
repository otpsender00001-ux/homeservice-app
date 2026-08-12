document.addEventListener('DOMContentLoaded', function() {

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
    
    fetchUsers();
    loadServiceList(); // Para sa Specialization dropdown
    document.getElementById('search-user').addEventListener('input', fetchUsers);
    document.getElementById('filter-role').addEventListener('change', fetchUsers);
});

async function fetchUsers() {
    const search = document.getElementById('search-user').value;
    const role = document.getElementById('filter-role').value;
    const tbody = document.getElementById('users-table-body');

    try {
        const response = await fetch(`../backend/users/get_users.php?search=${search}&role=${role}`);
        const users = await response.json();
        
        tbody.innerHTML = '';
        users.forEach(u => {
            tbody.innerHTML += `
                <tr>
                    <td><strong>${u.full_name}</strong></td>
                    <td><small>${u.email}<br>${u.phone || 'No Phone'}</small></td>
                    <td><span class="badge ${u.role === 'technician' ? 'badge-blue' : 'badge-green'}">${u.role.toUpperCase()}</span></td>
                    <td>${u.specialization || '—'}</td>
                    <td><span class="badge ${u.status === 'active' ? 'badge-green' : 'badge-red'}">${u.status}</span></td>
                    <td>
                        <button class="btn btn-dark" style="padding:5px 10px; font-size:11px" 
                            onclick="openUserModal(${u.id}, '${u.role}', '${u.status}', '${u.specialization || ''}')">Edit</button>
                    </td>
                </tr>
            `;
        });
    } catch (e) { console.error(e); }
}

async function loadServiceList() {
    const resp = await fetch('../backend/services/get_services.php');
    const services = await resp.json();
    const specSelect = document.getElementById('edit-spec');
    specSelect.innerHTML = '<option value="">None / All Services</option>';
    services.forEach(s => {
        specSelect.innerHTML += `<option value="${s.service_name}">${s.service_name}</option>`;
    });
}

function openUserModal(id, role, status, spec) {
    document.getElementById('edit-user-id').value = id;
    document.getElementById('edit-role').value = role;
    document.getElementById('edit-status').value = status;
    document.getElementById('edit-spec').value = spec;
    
    toggleSpecField();
    document.getElementById('userModal').style.display = 'block';
}

function toggleSpecField() {
    const role = document.getElementById('edit-role').value;
    document.getElementById('spec-field').style.display = (role === 'technician') ? 'block' : 'none';
}

function closeModal() { document.getElementById('userModal').style.display = 'none'; }

document.getElementById('userForm').onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append('id', document.getElementById('edit-user-id').value);
    fd.append('role', document.getElementById('edit-role').value);
    fd.append('status', document.getElementById('edit-status').value);
    fd.append('specialization', document.getElementById('edit-spec').value);

    const resp = await fetch('../backend/users/update_user.php', { method: 'POST', body: fd });
    const res = await resp.json();
    if(res.success) {
        closeModal();
        fetchUsers();
    }
};