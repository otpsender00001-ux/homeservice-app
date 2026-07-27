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
    loadServices();
    initAddressAPI();
    setupValidationAndRestrictions();

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
📍 ADDRESS API & LOGIC
===================== */
async function initAddressAPI() {
    const citySelect = document.getElementById('addr_city');
    const loader = document.getElementById('addr-loader');

    if(loader) loader.style.display = 'inline';
    try {
        const response = await fetch(`${BASE_URL}/provinces/${ZAMBALES_CODE}/cities-municipalities/`);
        const cities = await response.json();
        cities.sort((a, b) => a.name.localeCompare(b.name));
        cities.forEach(c => citySelect.add(new Option(c.name, c.code)));
    } catch (e) { console.error("API Error", e); }
    if(loader) loader.style.display = 'none';
}

document.getElementById('addr_city').onchange = async function() {
    const brgySelect = document.getElementById('addr_brgy');
    const loader = document.getElementById('addr-loader');
    
    brgySelect.innerHTML = '<option value="" selected disabled>Select Barangay</option>';
    brgySelect.disabled = true;
    if(loader) loader.style.display = 'inline';
    
    try {
        const response = await fetch(`${BASE_URL}/cities-municipalities/${this.value}/barangays/`);
        const barangays = await response.json();
        barangays.sort((a, b) => a.name.localeCompare(b.name));
        barangays.forEach(b => brgySelect.add(new Option(b.name, b.code)));
        brgySelect.disabled = false;
    } catch (e) { console.error("API Error", e); }
    
    if(loader) loader.style.display = 'none';
    validateAddressForm();
};

/* =====================
🔒 VALIDATION & RESTRICTIONS
===================== */
function setupValidationAndRestrictions() {
    const inputs = ['addr_name', 'addr_phone', 'addr_postal', 'addr_city', 'addr_brgy', 'addr_street'];
    const numberInputs = ['addr_phone', 'addr_postal'];

    numberInputs.forEach(id => {
        const el = document.getElementById(id);
        if(!el) return;
        el.addEventListener('keydown', (e) => {
            if ([46, 8, 9, 27, 13].indexOf(e.keyCode) !== -1 || (e.keyCode >= 35 && e.keyCode <= 39)) return;
            if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
                e.preventDefault();
            }
        });
    });

    inputs.forEach(id => {
        const el = document.getElementById(id);
        if(!el) return;
        el.addEventListener('input', validateAddressForm);
        el.addEventListener('change', validateAddressForm);
    });
}

function validateAddressForm() {
    const name = document.getElementById('addr_name').value.trim();
    const phone = document.getElementById('addr_phone').value.trim();
    const postal = document.getElementById('addr_postal').value.trim();
    const city = document.getElementById('addr_city').value;
    const brgy = document.getElementById('addr_brgy').value;
    const street = document.getElementById('addr_street').value.trim();
    const btn = document.getElementById('addr_submit_btn');

    if(!btn) return;

    if (name && phone && postal && city && brgy && street) {
        btn.classList.add('enabled');
        btn.disabled = false;
    } else {
        btn.classList.remove('enabled');
        btn.disabled = true;
    }
}

function saveAddress() {
    const street = document.getElementById('addr_street').value.trim();
    const postal = document.getElementById('addr_postal').value.trim();
    const cityText = document.getElementById('addr_city').options[document.getElementById('addr_city').selectedIndex].text;
    const brgyText = document.getElementById('addr_brgy').options[document.getElementById('addr_brgy').selectedIndex].text;
    
    finalPhone = document.getElementById('addr_phone').value.trim(); 

    finalAddress = `${street}, Brgy. ${brgyText}, ${cityText}, Zambales, ${postal}`;
    document.getElementById("selectedAddress").innerText = finalAddress;
    closeAddressModal();
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
function openAddressModal() { document.getElementById("addressModal").style.display = "flex"; }
function closeAddressModal() { document.getElementById("addressModal").style.display = "none"; }

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
                <div class="service-card" style="display: flex; flex-direction: column;">
                    <img src="../uploads/services/${s.image ?? 'default.png'}" 
                         style="width: 100%; height: 160px; object-fit: cover; border-radius: 8px; margin-bottom: 15px;"
                         onerror="this.src='../assets/images/default.png'">
                    
                    <h3>${s.service_name}</h3>

                    <!-- ✨ SHOPEE-STYLE SOLD/BOOKINGS BADGE -->
                    <div style="font-size: 13px; color: #f97316; font-weight: 600; margin-bottom: 8px; display: flex; align-items: center; gap: 5px;">
                        🔥 ${totalBooked} ${totalBooked == 1 ? 'Booking' : 'Bookings'}
                    </div>

                    <p style="flex-grow: 1;">${s.description}</p>
                    
                    <div class="service-footer" style="display: flex; justify-content: space-between; align-items: center; margin-top: 15px; border-top: 1px solid #f3f4f6; padding-top: 12px;">
                        <span style="font-size: 18px; font-weight: bold;">₱${price.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                        
                        <!-- ✨ PINAGANDANG BOOK BUTTON -->
                        <button onclick="bookService(${s.id}, '${s.service_name}', ${price})" 
                                style="background: linear-gradient(to right, #2563eb, #3b82f6); color: white; border: none; padding: 8px 20px; border-radius: 9999px; font-weight: 600; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);"
                                onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 12px -1px rgba(37, 99, 235, 0.4)';"
                                onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 6px -1px rgba(37, 99, 235, 0.2)';">
                            Book Now
                        </button>
                    </div>
                </div>`;
        });
    } catch (e) { container.innerHTML = "Error loading services."; }
}