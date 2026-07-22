document.addEventListener('DOMContentLoaded', fetchServices);

/* =====================
📦 FETCH SERVICES (ADMIN VIEW)
===================== */
async function fetchServices() {
    const container = document.getElementById('services-container');

    try {
        const response = await fetch('../backend/services/get_services.php?view=admin');
        const services = await response.json();

        container.innerHTML = '';

        services.forEach(s => {
            const isInactive = s.status === 'inactive';
            const imageDisplay = s.image ? s.image : 'default.png';

            container.innerHTML += `
                <div class="service-card ${isInactive ? 'inactive' : ''}">
                    
                    <img src="../uploads/services/${imageDisplay}" alt="Service" style="width: 100%; height: 160px; object-fit: cover; border-radius: 8px; margin-bottom: 10px; background: #f4f4f4;" onerror="this.style.display='none'">
                    
                    <div class="avatar">🛠</div>

                    <h4>${s.service_name} ${isInactive ? '<span style="color:red; font-size:12px;">(Deactivated)</span>' : ''}</h4>
                    <p>${s.description}</p>

                    <div style="margin-top:20px">
                        <span class="service-price">
                            ₱${parseFloat(s.price).toLocaleString()}
                        </span>
                    </div>

                    <div style="margin-top:15px; display:flex; gap:10px; flex-wrap:wrap;">
                        
                        ${
                            isInactive
                            // ✨ KUNG DEACTIVATED: Activate button lang ang ipapakita ✨
                            ? `<button class="btn btn-success" onclick="toggleService(${s.id}, 'active')" style="width: 100%;">
                                    Activate
                               </button>`
                            // ✨ KUNG ACTIVE: Ipapakita ang Edit, Deactivate, at Delete ✨
                            : `
                                <button class="btn btn-dark"
                                    onclick="openServiceModal(
                                        ${s.id},
                                        '${s.service_name}',
                                        '${s.description.replace(/'/g, "\\'")}',
                                        ${s.price},
                                        '${s.status}'
                                    )">
                                    Edit
                                </button>

                                <button class="btn btn-warning" onclick="toggleService(${s.id}, 'inactive')">
                                    Deactivate
                                </button>

                                <button class="btn btn-danger" onclick="deleteService(${s.id})">
                                    Delete
                                </button>
                            `
                        }

                    </div>

                </div>
            `;
        });

    } catch (e) {
        console.error("Error loading services", e);
    }
}

/* =====================
🔄 TOGGLE STATUS
===================== */
async function toggleService(id, status) {
    const actionText = status === 'active' ? 'Activate' : 'Deactivate';
    if (!confirm(`Are you sure you want to ${actionText} this service?`)) return;

    try {
        const res = await fetch('../backend/services/toggle_service.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `id=${id}&status=${status}`
        });

        const data = await res.json();

        if (data.success) {
            fetchServices();
        } else {
            alert("Failed to update status");
        }

    } catch (e) {
        console.error(e);
    }
}

/* =====================
❌ DELETE SERVICE
===================== */
async function deleteService(id) {
    if (!confirm("This will permanently delete the service!")) return;

    try {
        const res = await fetch('../backend/services/delete_service.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `id=${id}`
        });

        const data = await res.json();

        if (data.success) {
            fetchServices();
        } else {
            alert("Delete failed");
        }

    } catch (e) {
        console.error(e);
    }
}

/* =====================
📝 MODAL
===================== */
function openServiceModal(id = null, name = '', desc = '', price = '', status = 'active') {
    document.getElementById('service-id').value = id;
    document.getElementById('service-name').value = name;
    document.getElementById('service-desc').value = desc;
    document.getElementById('service-price').value = price;
    document.getElementById('service-status').value = status;
    
    document.getElementById('service-image').value = '';

    document.getElementById('modal-title').innerText = id ? 'Edit Service' : 'Add New Service';
    document.getElementById('serviceModal').style.display = 'block';
}

function closeModal() {
    document.getElementById('serviceModal').style.display = 'none';
}

/* =====================
💾 SAVE SERVICE
===================== */
document.getElementById('serviceForm').onsubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append('id', document.getElementById('service-id').value);
    formData.append('service_name', document.getElementById('service-name').value);
    formData.append('description', document.getElementById('service-desc').value);
    formData.append('price', document.getElementById('service-price').value);
    formData.append('status', document.getElementById('service-status').value);

    const imageFile = document.getElementById('service-image').files[0];
    if (imageFile) {
        formData.append('image', imageFile);
    }

    const response = await fetch('../backend/services/save_service.php', {
        method: 'POST',
        body: formData 
    });

    const result = await response.json();

    if (result.success) {
        closeModal();
        fetchServices();
    } else {
        alert("Error: " + result.message);
    }
};