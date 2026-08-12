document.addEventListener('DOMContentLoaded', fetchServices);


/* =========================
📦 FETCH SERVICES (ADMIN VIEW)
========================= */
async function fetchServices() {

    const container = document.getElementById('services-container');

    try {

        const response = await fetch(
            '../backend/services/get_services.php?view=admin'
        );

        const services = await response.json();

        container.innerHTML = '';

        services.forEach(s => {

            const isInactive = s.status === 'inactive';
            const imageDisplay = s.image ? s.image : 'default.png';

            container.innerHTML += `

                <div class="service-card ${isInactive ? 'inactive' : ''}">

                    <img
                        src="../uploads/services/${imageDisplay}"
                        alt="Service"
                        onerror="this.style.display='none'"
                    >

                    <div class="service-card-body">

                        <div class="avatar">
                            🛠
                        </div>

                        <h4>
                            ${escapeHtml(s.service_name)}

                            ${
                                isInactive
                                ? '<span style="color:red; font-size:12px;">(Deactivated)</span>'
                                : ''
                            }
                        </h4>

                        <p>
                            ${escapeHtml(s.description)}
                        </p>

                        <div style="margin-top:20px">

                            <span class="service-price">
                                ₱${parseFloat(s.price).toLocaleString()}
                            </span>

                        </div>

                    </div>


                    <div class="service-footer">

                        <div style="
                            display:flex;
                            gap:10px;
                            flex-wrap:wrap;
                            width:100%;
                        ">

                            ${
                                isInactive

                                ?

                                `
                                <button
                                    class="btn btn-success"
                                    onclick="toggleService(${s.id}, 'active')"
                                    style="width:100%;"
                                >
                                    Activate
                                </button>
                                `

                                :

                                `

                                <button
                                    class="btn btn-dark"
                                    onclick="editService(${s.id})"
                                >
                                    Edit
                                </button>

                                <button
                                    class="btn btn-warning"
                                    onclick="toggleService(${s.id}, 'inactive')"
                                >
                                    Deactivate
                                </button>

                                <button
                                    class="btn btn-danger"
                                    onclick="deleteService(${s.id})"
                                >
                                    Delete
                                </button>

                                `
                            }

                        </div>

                    </div>

                </div>

            `;

        });

    } catch (e) {

        console.error("Error loading services:", e);

        container.innerHTML = `
            <p style="color:red;">
                Failed to load services.
            </p>
        `;
    }
}


/* =========================
✏️ EDIT SERVICE
========================= */

async function editService(id) {

    try {

        /*
         * Get the service again from the backend
         * instead of passing the name/description
         * through an onclick string.
         */

        const response = await fetch(
            `../backend/services/get_services.php?view=admin`
        );

        const services = await response.json();

        const service = services.find(
            s => Number(s.id) === Number(id)
        );

        if (!service) {

            alert("Service not found.");

            return;
        }


        openServiceModal(
            service.id,
            service.service_name,
            service.description,
            service.price,
            service.status,
            service.image
        );

    } catch (error) {

        console.error("Error loading service:", error);

        alert("Unable to load service information.");

    }
}


/* =========================
📝 OPEN SERVICE MODAL
========================= */

function openServiceModal(
    id = null,
    name = '',
    desc = '',
    price = '',
    status = 'active',
    image = ''
) {

    const modal = document.getElementById('serviceModal');

    const serviceId = document.getElementById('service-id');
    const serviceName = document.getElementById('service-name');
    const serviceDesc = document.getElementById('service-desc');
    const servicePrice = document.getElementById('service-price');
    const serviceStatus = document.getElementById('service-status');
    const serviceImage = document.getElementById('service-image');
    const modalTitle = document.getElementById('modal-title');


    /*
     * Make sure all elements actually exist.
     */

    if (
        !modal ||
        !serviceId ||
        !serviceName ||
        !serviceDesc ||
        !servicePrice ||
        !serviceStatus ||
        !serviceImage ||
        !modalTitle
    ) {

        console.error("Service modal elements are missing.");

        return;
    }


    /* Fill form */

    serviceId.value = id || '';

    serviceName.value = name || '';

    serviceDesc.value = desc || '';

    servicePrice.value = price || '';

    serviceStatus.value = status || 'active';


    /*
     * File inputs cannot be pre-filled by JavaScript.
     * So just reset it.
     */

    serviceImage.value = '';


    /* Change modal title */

    modalTitle.innerText =
        id
        ? 'Edit Service'
        : 'Add New Service';


    /*
     * OPEN MODAL
     */

    modal.style.display = 'flex';

}


/* =========================
❌ CLOSE MODAL
========================= */

function closeModal() {

    const modal = document.getElementById('serviceModal');

    if (modal) {

        modal.style.display = 'none';

    }

}


/* =========================
🖱️ CLOSE WHEN CLICKING
OUTSIDE MODAL
========================= */

document.addEventListener('click', function(e) {

    const modal = document.getElementById('serviceModal');

    if (!modal) return;

    if (e.target === modal) {

        closeModal();

    }

});


/* =========================
🔄 TOGGLE STATUS
========================= */

async function toggleService(id, status) {

    const actionText =
        status === 'active'
        ? 'Activate'
        : 'Deactivate';


    if (
        !confirm(
            `Are you sure you want to ${actionText} this service?`
        )
    ) {

        return;

    }


    try {

        const res = await fetch(
            '../backend/services/toggle_service.php',
            {
                method: 'POST',

                headers: {
                    'Content-Type':
                        'application/x-www-form-urlencoded'
                },

                body:
                    `id=${encodeURIComponent(id)}` +
                    `&status=${encodeURIComponent(status)}`
            }
        );


        const data = await res.json();


        if (data.success) {

            fetchServices();

        } else {

            alert(
                data.message ||
                "Failed to update status."
            );

        }

    } catch (e) {

        console.error(
            "Toggle service error:",
            e
        );

        alert(
            "Something went wrong while updating the service."
        );

    }

}


/* =========================
❌ DELETE SERVICE
========================= */

async function deleteService(id) {

    if (
        !confirm(
            "This will permanently delete the service!"
        )
    ) {

        return;

    }


    try {

        const res = await fetch(
            '../backend/services/delete_service.php',
            {
                method: 'POST',

                headers: {
                    'Content-Type':
                        'application/x-www-form-urlencoded'
                },

                body:
                    `id=${encodeURIComponent(id)}`
            }
        );


        const data = await res.json();


        if (data.success) {

            fetchServices();

        } else {

            alert(
                data.message ||
                "Delete failed."
            );

        }

    } catch (e) {

        console.error(
            "Delete service error:",
            e
        );

        alert(
            "Something went wrong while deleting the service."
        );

    }

}


/* =========================
💾 SAVE SERVICE
========================= */

document.addEventListener('DOMContentLoaded', function() {

    const form =
        document.getElementById('serviceForm');


    if (!form) {

        console.error(
            "serviceForm not found."
        );

        return;

    }


    form.addEventListener(
        'submit',
        async function(e) {

            e.preventDefault();


            const formData =
                new FormData();


            formData.append(
                'id',
                document.getElementById(
                    'service-id'
                ).value
            );


            formData.append(
                'service_name',
                document.getElementById(
                    'service-name'
                ).value
            );


            formData.append(
                'description',
                document.getElementById(
                    'service-desc'
                ).value
            );


            formData.append(
                'price',
                document.getElementById(
                    'service-price'
                ).value
            );


            formData.append(
                'status',
                document.getElementById(
                    'service-status'
                ).value
            );


            const imageFile =
                document.getElementById(
                    'service-image'
                ).files[0];


            if (imageFile) {

                formData.append(
                    'image',
                    imageFile
                );

            }


            try {

                const response =
                    await fetch(
                        '../backend/services/save_service.php',
                        {
                            method: 'POST',
                            body: formData
                        }
                    );


                const result =
                    await response.json();


                if (result.success) {

                    closeModal();

                    fetchServices();

                } else {

                    alert(
                        "Error: " +
                        (
                            result.message ||
                            "Unable to save service."
                        )
                    );

                }

            } catch (error) {

                console.error(
                    "Save service error:",
                    error
                );

                alert(
                    "Something went wrong while saving the service."
                );

            }

        }
    );

});


/* =========================
🛡️ HTML ESCAPE
========================= */

function escapeHtml(value) {

    if (value === null || value === undefined) {

        return '';

    }

    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

}