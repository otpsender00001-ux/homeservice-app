/* =====================
🌍 GLOBAL CONFIG
===================== */
const BASE_URL = 'https://psgc.gitlab.io/api';
const ZAMBALES_CODE = '037100000'; 

let selectedService = null;
let selectedSlot = null;
let selectedServiceName = "";
let selectedServicePrice = 0;
let selectedPayment = "cash"; 
let finalAddress = ""; 
let finalPhone = ""; // DAGDAG: Para sa phone number

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
    
    loadServices();

    // 👉 FRONTEND FIX: Para hindi na ma-click ang nakalipas na araw sa kalendaryo
    const dateInput = document.getElementById("bookingDate");
    if (dateInput) {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        dateInput.setAttribute('min', `${yyyy}-${mm}-${dd}`);
    }
});

/* =====================
📍 BOOKING ADDRESS SELECTION
===================== */

let bookingAddresses = [];


async function openAddressSelectionModal() {

    const modal =
        document.getElementById("addressSelectionModal");

    if (!modal) return;

    modal.style.display = "flex";

    await loadBookingAddresses();

}


function closeAddressSelectionModal() {

    const modal =
        document.getElementById("addressSelectionModal");

    if (!modal) return;

    modal.style.display = "none";

}


async function loadBookingAddresses() {

    const container =
        document.getElementById("bookingAddressList");

    if (!container) return;


    container.innerHTML = `
        <div
            style="
                padding:35px 15px;
                text-align:center;
                color:#777;
                font-size:14px;
            "
        >
            Loading addresses...
        </div>
    `;


    try {

        const response = await fetch(
            "../backend/users/get_address.php",
            {
                credentials: "same-origin"
            }
        );


        const result =
            await response.json();


        if (!result.success) {

            container.innerHTML = `
                <div
                    style="
                        padding:35px 15px;
                        text-align:center;
                        color:#777;
                    "
                >
                    Unable to load your addresses.
                </div>
            `;

            return;

        }


        bookingAddresses =
            result.addresses || [];


        if (bookingAddresses.length === 0) {

            container.innerHTML = `
                <div
                    style="
                        padding:35px 15px;
                        text-align:center;
                        color:#777;
                    "
                >

                    <strong>
                        No saved addresses yet.
                    </strong>

                    <br><br>

                    Please add an address first
                    in My Profile.

                </div>
            `;

            return;

        }


        container.innerHTML = "";


        bookingAddresses.forEach(address => {

            const card =
                document.createElement("div");

            card.className =
                "booking-address-card";


            const defaultBadge =
                Number(address.is_default) === 1
                    ? `
                        <span class="booking-default-badge">
                            Default
                        </span>
                    `
                    : "";


            const fullAddress =
                formatBookingAddress(address);


            card.innerHTML = `

                <div
                    style="
                        display:flex;
                        justify-content:space-between;
                        align-items:flex-start;
                        gap:10px;
                    "
                >

                    <div>

                        <h4 class="booking-address-name">
                            ${escapeBookingHtml(
                                address.recipient_name
                            )}
                        </h4>

                        <p class="booking-address-phone">
                            ${escapeBookingHtml(
                                address.phone
                            )}
                        </p>

                    </div>

                    ${defaultBadge}

                </div>


                <p class="booking-address-text">
                    ${escapeBookingHtml(
                        fullAddress
                    )}
                </p>


                <button
                    type="button"
                    class="booking-select-btn"
                    onclick="selectBookingAddress(${Number(address.id)})"
                >
                    Select This Address
                </button>

            `;


            container.appendChild(card);

        });


    } catch (error) {

        console.error(
            "Address loading error:",
            error
        );


        container.innerHTML = `
            <div
                style="
                    padding:35px 15px;
                    text-align:center;
                    color:#777;
                "
            >
                Unable to load addresses.
            </div>
        `;

    }

}


function selectBookingAddress(addressId) {

    const address =
        bookingAddresses.find(
            item =>
                Number(item.id) === Number(addressId)
        );


    if (!address) {

        alert("Address not found.");

        return;

    }


    finalPhone =
        address.phone || "";


    finalAddress =
        formatBookingAddress(address);


    const selectedAddress =
        document.getElementById("selectedAddress");


    selectedAddress.innerHTML = `

        <strong
            style="
                display:block;
                color:#333;
                margin-bottom:3px;
            "
        >
            ${escapeBookingHtml(
                address.recipient_name
            )}
        </strong>

        <span
            style="
                display:block;
                margin-bottom:5px;
            "
        >
            ${escapeBookingHtml(
                address.phone
            )}
        </span>

        <span>
            ${escapeBookingHtml(
                finalAddress
            )}
        </span>

    `;


    closeAddressSelectionModal();

}


function formatBookingAddress(address) {

    const parts = [];


    if (address.street) {
        parts.push(address.street);
    }


    if (address.barangay) {
        parts.push(
            "Brgy. " + address.barangay
        );
    }


    if (address.city) {
        parts.push(address.city);
    }


    if (address.province) {
        parts.push(address.province);
    }


    if (address.postal_code) {
        parts.push(address.postal_code);
    }


    return parts.join(", ");

}


function escapeBookingHtml(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}



/* =====================
🚀 MODAL & BOOKING LOGIC
===================== */
function bookService(serviceId, serviceName = "", price = 0) {
    selectedService = serviceId;
    selectedServiceName = serviceName;
    selectedServicePrice = price; 
    
    document.getElementById("bookingModal").style.display = "flex";
    document.getElementById("selectedServiceName").innerText = serviceName;
    
    const priceDisplay = document.getElementById("selectedServicePrice");
    if(priceDisplay) {
        priceDisplay.innerText = "₱" + parseFloat(price).toLocaleString(undefined, {minimumFractionDigits: 2});
    }

    document.getElementById("bookingDate").value = "";
    document.getElementById("timeSlots").innerHTML = "<p>Select date first</p>";
    document.getElementById("selectedAddress").innerText = "No address selected";
    finalAddress = "";
}

function closeModal() { document.getElementById("bookingModal").style.display = "none"; }
function openAddressModal() {
    openAddressSelectionModal();
}

function closeAddressModal() {
    closeAddressSelectionModal();
}

function selectPayment(el) {
    document.querySelectorAll(".payment-card").forEach(card => card.classList.remove("active"));
    el.classList.add("active");
    selectedPayment = el.getAttribute("data-value");
}

document.getElementById("bookingDate").addEventListener("change", async function () {
    const container = document.getElementById("timeSlots");
    if (!this.value) return;
    container.innerHTML = "<p>Loading slots...</p>";
    try {
        const res = await fetch(`../backend/bookings/get_time_slots.php?date=${this.value}`);
        const slots = await res.json();
        container.innerHTML = "";
        slots.forEach(s => {
            const btn = document.createElement("button");
            btn.innerText = `${formatTime(s.time_start)} - ${formatTime(s.time_end)}`;
            btn.className = s.available ? "slot-btn" : "slot-btn full";
            if(s.available) {
                btn.onclick = () => {
                    document.querySelectorAll(".slot-btn").forEach(b => b.classList.remove("active"));
                    btn.classList.add("active");
                    selectedSlot = s;
                };
            }
            container.appendChild(btn);
        });
    } catch (e) { container.innerHTML = "Error loading slots."; }
});

document.getElementById("confirmBooking").onclick = async () => {
    const date = document.getElementById("bookingDate").value;
    if (!date || !selectedSlot || !finalAddress) {
        alert("Please complete all details including address.");
        return;
    }

    const formData = new FormData();
    formData.append("service_id", selectedService);
    formData.append("date", date);
    formData.append("time_start", selectedSlot.time_start);
    formData.append("time_end", selectedSlot.time_end);
    formData.append("address", finalAddress);
    formData.append("phone", finalPhone); 
    formData.append("payment_method", selectedPayment);
    formData.append("total_amount", selectedServicePrice);

    try {
        const res = await fetch('../backend/bookings/create_booking.php', { method: 'POST', body: formData });
        const result = await res.json();
       if (result.status === "success") { 
            location.reload(); 
        } else if (result.status === "full") {
            alert("⚠️ This slot is already full.");
        } else { 
            alert("❌ Failed: " + (result.message || "Unknown error")); 
        }
    } catch (e) { alert("Server Error."); }
};

function formatTime(time) {
    let [h, m] = time.split(":");
    let hour = parseInt(h);
    let ampm = hour >= 12 ? "PM" : "AM";
    hour = hour % 12 || 12;
    return `${hour}:${m} ${ampm}`;
}

async function loadServices() {
    const container = document.getElementById('services-list');
    try {
        const res = await fetch('../backend/services/get_services.php');
        const data = await res.json();
        container.innerHTML = "";
        data.forEach(s => {
            const price = parseFloat(s.price);
            
            // 👉 SHOPEE-STYLE BOOKINGS COUNT (Kung walang laman, 0 ang ilalagay)
            const totalBooked = s.total_booked ? s.total_booked : 0;

            container.innerHTML += `
    <div class="service-card service-card-modern">

        <div class="service-image-wrapper">

            <img
                src="../uploads/services/${s.image ?? 'default.png'}"
                class="service-image"
                onerror="this.src='../assets/images/default.png'"
            >

        </div>


        <div class="service-card-body">

            <div class="service-title-row">

                <h3 class="service-name">
                    ${s.service_name}
                </h3>

            </div>


            <div class="service-bookings">
                ${totalBooked}
                ${totalBooked == 1 ? 'Booking' : 'Completed Jobs'}
            </div>


            <p class="service-description">
                ${s.description}
            </p>


            <div class="service-footer">

                <span class="service-price">
                    ₱${price.toLocaleString(undefined, {
                        minimumFractionDigits: 2
                    })}
                </span>


                <button
                    class="service-book-btn"
                    onclick="bookService(
                        ${s.id},
                        '${s.service_name}',
                        ${price}
                    )"
                >
                    Book Now
                </button>

            </div>

        </div>

    </div>
`;
        });
    } catch (e) { container.innerHTML = "Error loading services."; }
}