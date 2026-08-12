let map;
let userMarker = null;
let techMarker = null;
let routeLine = null;
let watchId = null;
let trackInterval = null; 

// 🛡️ Naka-OFF by default. Bubuksan lang natin kapag confirmed na may "in_progress" na job.
let isTrackingActive = false; 

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
    
    initMap();
    
    const locateBtn = document.getElementById('my-location-btn');
    if(locateBtn) {
        locateBtn.addEventListener('click', locateUser);
    }
    
    // I-check MUNA sa database bago mag-start ang GPS
    fetchBooking();
});

function initMap() {
    map = L.map('map', {
        zoomControl: false,
        maxZoom: 22
    }).setView([14.5995, 120.9842], 15);

    const street = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');
    const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}');

    street.addTo(map);
    L.control.layers({ "Street": street, "Satellite": satellite }).addTo(map);
    L.control.zoom({ position: 'topleft' }).addTo(map);

    trackInterval = setInterval(fetchBooking, 3000);
}

/* =====================
📦 GET USER BOOKING
===================== */
async function fetchBooking() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const bId = urlParams.get('id');
        const endpoint = bId ? `../backend/bookings/get_user_booking.php?id=${bId}` : '../backend/bookings/get_user_booking.php';

        const res = await fetch(endpoint);
        const data = await res.json();

        const status = data.status ? data.status.toLowerCase() : '';

        // 🛡️ MASTER KILL SWITCH LOGIC
        if (status === 'completed' || status === 'cancelled' || !data.tech_lat) {
            isTrackingActive = false; // PATAYIN ANG TRACKER
            
            if (trackInterval) { clearInterval(trackInterval); trackInterval = null; }

            // BURAHIN LAHAT NG NASA MAPA
            if (techMarker) { map.removeLayer(techMarker); techMarker = null; }
            if (routeLine) { map.removeLayer(routeLine); routeLine = null; }
            if (userMarker) { map.removeLayer(userMarker); userMarker = null; }
            
            // PATAYIN ANG GPS SENSOR NG BROWSER
            if (watchId !== null) { navigator.geolocation.clearWatch(watchId); watchId = null; }

            // UPDATE UI TEXT
            const etaElem = document.getElementById('eta');
            const techNameElem = document.getElementById('tech-name');
            const phoneElem = document.getElementById('tech-phone-display');
            const callBtn = document.getElementById('callTechBtn');

            if (etaElem) etaElem.innerText = "No Active Service";
            if (techNameElem) techNameElem.innerText = "Tracking is offline.";
            if (phoneElem) phoneElem.style.display = 'none';
            if (callBtn) callBtn.style.display = 'none';
            
            // GRAY-OUT ANG MAPA
            const mapContainer = document.getElementById('map');
            if (mapContainer) {
                mapContainer.style.filter = "grayscale(100%)";
                mapContainer.style.opacity = "0.6";
                mapContainer.style.pointerEvents = "none";
            }
            return; 
        }

        // Kung 'in_progress', buksan ang tracking at i-update ang Tech Marker
        if (status === 'in_progress') {
            if (!isTrackingActive) {
                isTrackingActive = true;
                locateUser(); // Saka lang natin bubuksan ang blue dot!
            }
            updateTech(data);
        }
    } catch (e) {
        console.error("Booking Fetch Error:", e);
    }
}

function updateTech(data) {
    if (!isTrackingActive || !data.tech_lat) return;

    const techPos = [parseFloat(data.tech_lat), parseFloat(data.tech_lng)];
    const techInitial = data.tech_name ? data.tech_name.charAt(0).toUpperCase() : 'T';

    // ✨ SHOPEE-STYLE MOTORCYCLE MARKER
    if (!techMarker) {
        const customIcon = L.divIcon({
            className: 'custom-tech-icon',
            html: `<div style="background: #ee4d2d; border: 2px solid #fff; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.3); font-size: 16px;">🛵</div>`,
            iconSize: [36, 36],
            iconAnchor: [18, 18]
        });

        techMarker = L.marker(techPos, { icon: customIcon }).addTo(map);
    } else {
        techMarker.setLatLng(techPos);
    }

    map.panTo(techPos, { animate: true, duration: 1.0 });

    // ✨ UPDATE TECH INFO CARD AT BOTTOM (Shopee Style Rider Info)
    if(document.getElementById('tech-name')) {
        document.getElementById('tech-name').innerText = `${data.tech_name || 'Technician'} • ${data.service || 'Service'}`;
    }

    if(document.getElementById('tech-avatar-icon')) {
        document.getElementById('tech-avatar-icon').innerText = techInitial;
    }

    // Kung may phone number ang technician sa data
    if(data.tech_phone && document.getElementById('tech-phone-display')) {
        const phoneDisplay = document.getElementById('tech-phone-display');
        phoneDisplay.innerText = `📞 ${data.tech_phone}`;
        phoneDisplay.style.display = 'block';
    }

    // Ipakita ang Call button kung may phone
    if(document.getElementById('callTechBtn')) {
        const callBtn = document.getElementById('callTechBtn');
        callBtn.style.display = 'block';
        if(data.tech_phone) {
            callBtn.onclick = () => { window.location.href = `tel:${data.tech_phone}`; };
        }
    }

    if (userMarker) drawRoute();
}

/* =====================
📍 USER LOCATION (BLUE DOT)
===================== */
function locateUser() {
    // 🛡️ GUARD: Bawal mag-locate kung walang active job!
    if (!isTrackingActive || !navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(pos => {
        if (!isTrackingActive) return; // Double check

        const userPos = [pos.coords.latitude, pos.coords.longitude];

        if (!userMarker) {
            userMarker = L.circleMarker(userPos, {
                radius: 8, fillColor: "#2563eb", color: "#fff", weight: 2, fillOpacity: 1
            }).addTo(map);
        } else {
            userMarker.setLatLng(userPos);
        }

        if (watchId === null) {
            watchId = navigator.geolocation.watchPosition(updateUser);
        }
    }, err => console.error("Location Error:", err));
}

function updateUser(pos) {
    if (!isTrackingActive) return; 
    const userPos = [pos.coords.latitude, pos.coords.longitude];
    if (userMarker) userMarker.setLatLng(userPos);
}

/* =====================
🧭 ROUTE LOGIC (SHOPEE STYLE PATH)
===================== */
async function drawRoute() {
    if (!isTrackingActive || !userMarker || !techMarker) return;

    const start = userMarker.getLatLng(); // Client Location
    const end = techMarker.getLatLng();   // Technician Location
    const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;

    try {
        const res = await fetch(url);
        const data = await res.json();

        if (data.routes && data.routes.length > 0) {
            const coords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);

            if (routeLine) {
                routeLine.setLatLngs(coords);
            } else {
                // ✨ SHOPEE STYLE DASHED ORANGE ROUTING LINE
                routeLine = L.polyline(coords, { 
                    color: '#ee4d2d', 
                    weight: 6, 
                    opacity: 0.8, 
                    dashArray: '8, 12',
                    lineCap: 'round'
                }).addTo(map);
            }

            const duration = Math.round(data.routes[0].duration / 60);
            const etaElem = document.getElementById('eta');
            if (etaElem) {
                etaElem.innerText = duration > 0 ? `Estimated Arrival: ${duration} mins` : "Rider is arriving now!";
            }
        }
    } catch (err) { console.error("Routing Error:", err); }
}

// Fallback call function kung sakaling walang direct action sa HTML
function callTechnician() {
    console.log("Calling rider...");
}