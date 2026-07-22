let map;
let technicianMarkers = {};

// 📍 USER (Admin/Customer Location)
let userMarker = null;
let userCircle = null;
let watchId = null;

// 🧭 ROUTING
let routeLine = null;

document.addEventListener('DOMContentLoaded', function() {
    initMap();

    // 🔥 SEARCH LOGIC: Automatic Focus kapag nag-search
    document.getElementById('search-tech').addEventListener('input', function() {
        fetchTechnicianLocations(true); // 'true' means galing sa search input
    });

    const locateBtn = document.getElementById('my-location-btn');
    if (locateBtn) {
        locateBtn.addEventListener('click', locateUser);
    }
});

function initMap() {
    map = L.map('map', {
        zoomControl: false,
        maxZoom: 22 
    }).setView([14.5995, 120.9842], 16);

    const streetMap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    const satelliteMap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Esri'
    });

    L.control.layers({ "🗺️ Street": streetMap, "🛰️ Satellite": satelliteMap }).addTo(map);
    L.control.zoom({ position: 'topleft' }).addTo(map);

    fetchTechnicianLocations();
    setInterval(() => fetchTechnicianLocations(false), 3000); 
}

async function fetchTechnicianLocations(isManualSearch = false) {
    const searchElement = document.getElementById('search-tech');
    const searchQuery = searchElement ? searchElement.value.toLowerCase().trim() : "";

    try {
        const response = await fetch('../backend/users/get_users.php?role=technician');
        const techs = await response.json();

        techs.forEach(t => {
            // 🛡️ PRO FIX: Kapag may laman ang lat at lng, i-display. Kung null na (dahil job completed), i-remove!
            if (t.lat !== null && t.lng !== null) {
                const newPos = [parseFloat(t.lat), parseFloat(t.lng)];
                const isMatching = t.full_name.toLowerCase().includes(searchQuery);
                
                // Status check
                const isLive = (t.status === 'in-transit' || t.status === 'in_progress');
                const markerColor = isLive ? '#ff4500' : '#28a745';

                if (technicianMarkers[t.id]) {
                    // 1. UPDATE EXISTING: I-update ang pwesto
                    technicianMarkers[t.id].setLatLng(newPos);
                    
                    // Update ang kulay at pulse
                    const iconDiv = technicianMarkers[t.id].getElement()?.querySelector('.tech-ping-circle');
                    if(iconDiv) {
                        iconDiv.style.backgroundColor = markerColor;
                        isLive ? iconDiv.classList.add('pulse-active') : iconDiv.classList.remove('pulse-active');
                    }
                } else {
                    // 2. CREATE NEW: Gawa ng marker kung wala pa
                    const techIcon = L.divIcon({
                        className: 'custom-tech-wrapper',
                        html: `<div class="tech-ping-circle ${isLive ? 'pulse-active' : ''}" style="background-color: ${markerColor};"></div>`,
                        iconSize: [20, 20]
                    });

                    const marker = L.marker(newPos, { icon: techIcon }).addTo(map);
                    marker.bindPopup(createPopupContent(t));
                    
                    marker.on('click', () => {
                        if (userMarker) drawRoute(userMarker.getLatLng(), newPos);
                        updateDetailPanel(t);
                    });

                    technicianMarkers[t.id] = marker;
                }

                // 🔥 SMART VISIBILITY LOGIC:
                const markerElement = technicianMarkers[t.id].getElement();
                if (markerElement) {
                    if (searchQuery === "" || isMatching) {
                        markerElement.style.display = "block"; // Pakita
                    } else {
                        markerElement.style.display = "none";  // Tago pero andyan pa rin
                    }
                }

                // 🔥 AUTO-FOCUS: Kung nag-ma-match sa search
                if (isManualSearch && searchQuery !== "" && isMatching) {
                    map.flyTo(newPos, 18, { animate: true, duration: 1.5 });
                    technicianMarkers[t.id].openPopup();
                    updateDetailPanel(t);
                }
            } else {
                // 🛡️ PRO FIX: Kapag tinapos na ang job, magiging null sa DB ang location kaya papasok siya dito at buburahin ng Admin map yung marker.
                if (technicianMarkers[t.id]) {
                    map.removeLayer(technicianMarkers[t.id]);
                    delete technicianMarkers[t.id];
                }
            }
        });
    } catch (e) {
        console.error("Admin Map Error:", e);
    }
}

function updateDetailPanel(t) {
    const displayName = document.getElementById('display-name');
    const displaySpec = document.getElementById('display-spec');
    if (displayName) displayName.innerText = t.full_name;
    if (displaySpec) displaySpec.innerText = t.specialization || 'On-duty Technician';
}

function createPopupContent(t) {
    const isLive = (t.status === 'in-transit' || t.status === 'in_progress');
    const statusText = isLive ? 'ON THE WAY' : 'AVAILABLE';
    const statusColor = isLive ? '#ff4500' : '#28a745';
    
    return `
        <div style="font-family: 'Inter', sans-serif; padding:5px; min-width:140px;">
            <strong style="display:block; margin-bottom:2px;">${t.full_name}</strong>
            <small style="color:#666;">${t.specialization || 'Technician'}</small>
            <div style="margin-top:8px; display:flex; align-items:center; gap:5px;">
                <span style="width:8px; height:8px; background:${statusColor}; border-radius:50%; display:inline-block;"></span>
                <b style="font-size:10px; color:${statusColor}">${statusText}</b>
            </div>
        </div>
    `;
}

window.zoomToTech = (lat, lng) => {
    map.flyTo([lat, lng], 19);
};

/* =========================
📍 MY LOCATION LOGIC
========================= */

function locateUser() {
    if (!navigator.geolocation) return alert("Geolocation not supported.");
    navigator.geolocation.getCurrentPosition(successLocation, errorLocation, { enableHighAccuracy: true });
}

function successLocation(position) {
    const userPos = [position.coords.latitude, position.coords.longitude];
    if (userMarker) { map.removeLayer(userMarker); map.removeLayer(userCircle); }

    userMarker = L.circleMarker(userPos, {
        radius: 8, fillColor: "#2563eb", color: "#fff", weight: 3, fillOpacity: 1
    }).addTo(map).bindPopup("Admin (You)").openPopup();

    userCircle = L.circle(userPos, {
        radius: position.coords.accuracy, fillColor: "#2563eb", fillOpacity: 0.1
    }).addTo(map);

    map.flyTo(userPos, 17);
}

function errorLocation() {
    alert("Please enable location services.");
}

async function drawRoute(start, end) {
    try {
        if (routeLine) map.removeLayer(routeLine);
        const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end[1]},${end[0]}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.routes && data.routes.length > 0) {
            const coords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
            routeLine = L.polyline(coords, { color: '#2563eb', weight: 5, opacity: 0.7, dashArray: '5, 10' }).addTo(map);
            map.fitBounds(routeLine.getBounds(), { padding: [40, 40] });
        }
    } catch (err) { console.error("Routing failed:", err); }
}