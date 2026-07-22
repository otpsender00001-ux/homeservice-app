let map;
let userMarker = null;
let techMarker = null;
let routeLine = null;
let watchId = null;
let trackInterval = null; 

// 🛡️ Naka-OFF by default. Bubuksan lang natin kapag confirmed na may "in_progress" na job.
let isTrackingActive = false; 

document.addEventListener('DOMContentLoaded', () => {
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
            if (etaElem) etaElem.innerText = "No Active Service";
            if (techNameElem) techNameElem.innerText = "Tracking is offline.";
            
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

    if (!techMarker) {
        const customIcon = L.divIcon({
            className: 'tech-circle-icon',
            html: `<span>${techInitial}</span>`,
            iconSize: [35, 35],
            iconAnchor: [17, 17]
        });

        techMarker = L.marker(techPos, { icon: customIcon }).addTo(map);
        techMarker.bindTooltip(`
            <div style="text-align:center; line-height: 1.2;">
                <strong style="display:block;">${data.tech_name}</strong>
                <span style="font-size:10px; color:rgba(255,255,255,0.8);">${data.service}</span>
            </div>`, { permanent: true, direction: 'top', className: 'tech-label', offset: [0, -15] }).openTooltip();
    } else {
        techMarker.setLatLng(techPos);
    }

    map.panTo(techPos, { animate: true, duration: 1.0 });

    if(document.getElementById('tech-name')) {
        document.getElementById('tech-name').innerText = `${data.tech_name} • ${data.service}`;
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
🧭 ROUTE LOGIC
===================== */
async function drawRoute() {
    if (!isTrackingActive || !userMarker || !techMarker) return;

    const start = userMarker.getLatLng();
    const end = techMarker.getLatLng();
    const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;

    try {
        const res = await fetch(url);
        const data = await res.json();

        if (data.routes && data.routes.length > 0) {
            const coords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);

            if (routeLine) {
                routeLine.setLatLngs(coords);
            } else {
                routeLine = L.polyline(coords, { color: '#ee4d2d', weight: 5, opacity: 0.6, dashArray: '5, 10' }).addTo(map);
            }

            const duration = Math.round(data.routes[0].duration / 60);
            const etaElem = document.getElementById('eta');
            if (etaElem) etaElem.innerText = duration > 0 ? `${duration} mins away` : "Arriving now";
        }
    } catch (err) { console.error("Routing Error:", err); }
}