let map;
let technicianMarkers = {};

// 📍 USER (Admin/Customer Location)
let userMarker = null;
let userCircle = null;
let watchId = null;

// 🧭 ROUTING
let routeLine = null;
let allTechsCache = []; // Cache para sa modal list

document.addEventListener('DOMContentLoaded', function() {

    // =========================
    // LOGOUT MODAL
    // =========================

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

        // Click outside the logout box
        logoutModal.addEventListener("click", function(e) {
            if (e.target === logoutModal) {
                logoutModal.classList.remove("show");
            }
        });
    }


    // =========================
    // TRACKING INITIALIZATION
    // =========================

    initMap();


    // 🔥 SEARCH LOGIC
    const searchTech = document.getElementById('search-tech');

    if (searchTech) {
        searchTech.addEventListener('input', function() {
            fetchTechnicianLocations(true);
        });
    }


    // 📍 MY LOCATION BUTTON
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
        allTechsCache = techs; // I-save sa cache para sa Modal list

        // Update active count badge sa button
        const activeTechs = techs.filter(t => t.lat !== null && t.lng !== null);
        const countBadge = document.getElementById('active-tech-count');
        if(countBadge) countBadge.innerText = activeTechs.length;

        techs.forEach(t => {
            if (t.lat !== null && t.lng !== null) {
                const newPos = [parseFloat(t.lat), parseFloat(t.lng)];
                const isMatching = t.full_name.toLowerCase().includes(searchQuery);
                
                const isLive = (t.status === 'in-transit' || t.status === 'in_progress');
                const markerColor = isLive ? '#ee4d2d' : '#28a745';

                if (technicianMarkers[t.id]) {
                    // 1. UPDATE EXISTING: I-update ang pwesto
                    technicianMarkers[t.id].setLatLng(newPos);
                    
                    const iconDiv = technicianMarkers[t.id].getElement()?.querySelector('.tech-ping-circle');
                    if(iconDiv) {
                        iconDiv.style.backgroundColor = markerColor;
                        isLive ? iconDiv.classList.add('pulse-active') : iconDiv.classList.remove('pulse-active');
                    }
                } else {
                    // 2. CREATE NEW: Shopee-style Motorcycle Marker
                    const techIcon = L.divIcon({
                        className: 'custom-tech-wrapper',
                        html: `<div class="tech-ping-circle ${isLive ? 'pulse-active' : ''}" style="background-color: ${markerColor}; width: 36px; height: 36px; border-radius: 50%; border: 2px solid #fff; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.3); font-size: 16px;">🛵</div>`,
                        iconSize: [36, 36],
                        iconAnchor: [18, 18]
                    });

                    const marker = L.marker(newPos, { icon: techIcon }).addTo(map);
                    marker.bindPopup(createPopupContent(t));
                    
                    marker.on('click', () => {
                        if (userMarker) drawRoute(userMarker.getLatLng(), newPos);
                        updateDetailPanel(t);
                    });

                    technicianMarkers[t.id] = marker;
                }

                const markerElement = technicianMarkers[t.id].getElement();
                if (markerElement) {
                    if (searchQuery === "" || isMatching) {
                        markerElement.style.display = "block"; 
                    } else {
                        markerElement.style.display = "none";  
                    }
                }

                if (isManualSearch && searchQuery !== "" && isMatching) {
                    map.flyTo(newPos, 18, { animate: true, duration: 1.5 });
                    technicianMarkers[t.id].openPopup();
                    updateDetailPanel(t);
                }
            } else {
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
    const panelAvatar = document.getElementById('panel-avatar-icon');
    
    if (displayName) displayName.innerText = t.full_name;
    if (displaySpec) displaySpec.innerText = t.specialization || 'On-duty Technician';
    if (panelAvatar) panelAvatar.innerText = t.full_name ? t.full_name.charAt(0).toUpperCase() : '👤';
}

function createPopupContent(t) {
    const isLive = (t.status === 'in-transit' || t.status === 'in_progress');
    const statusText = isLive ? 'ON THE WAY' : 'AVAILABLE';
    const statusColor = isLive ? '#ee4d2d' : '#28a745';
    
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
            // ✨ SHOPEE STYLE DASHED ORANGE ROUTING LINE PARA SA ADMIN DIN
            routeLine = L.polyline(coords, { 
                color: '#ee4d2d', 
                weight: 6, 
                opacity: 0.8, 
                dashArray: '8, 12',
                lineCap: 'round'
            }).addTo(map);
            map.fitBounds(routeLine.getBounds(), { padding: [40, 40] });
        }
    } catch (err) { console.error("Routing failed:", err); }
}

/* =========================
🛵 MODAL & TECH CARDS SELECTOR
========================= */

function openTechModal() {
    const overlay = document.getElementById('techModalOverlay');
    const container = document.getElementById('tech-cards-container');
    container.innerHTML = '';

    // Salain ang mga may active location lang
    const activeTechs = allTechsCache.filter(t => t.lat !== null && t.lng !== null);

    if (activeTechs.length === 0) {
        container.innerHTML = `<p style="text-align: center; color: #888; padding: 20px;">No technicians currently active on map.</p>`;
    } else {
        activeTechs.forEach(t => {
            const initial = t.full_name ? t.full_name.charAt(0).toUpperCase() : 'T';
            const card = document.createElement('div');
            card.className = 'tech-card-item';
            card.innerHTML = `
                <div class="tech-card-info">
                    <div class="tech-card-avatar">${initial}</div>
                    <div>
                        <h4 style="margin: 0; color: #111; font-size: 15px;">${t.full_name}</h4>
                        <p style="margin: 3px 0 0; color: #666; font-size: 12px;">${t.specialization || 'Technician'} • <span style="color: #ee4d2d; font-weight: 600;">Active</span></p>
                    </div>
                </div>
                <span style="color: #ee4d2d; font-size: 14px; font-weight: bold;">Track &rarr;</span>
            `;

            // Kapag pinindot ang card ni technician:
            card.onclick = () => {
                selectAndTrackTech(t);
                closeTechModal();
            };

            container.appendChild(card);
        });
    }

    overlay.style.display = 'flex';
}

function closeTechModal(event) {
    if (!event || event.target.id === 'techModalOverlay' || event.target.tagName === 'BUTTON') {
        document.getElementById('techModalOverlay').style.display = 'none';
    }
}

function selectAndTrackTech(t) {
    const latLng = [parseFloat(t.lat), parseFloat(t.lng)];
    
    // 1. Isara/I-hide ang ibang hindi kasali kung gusto, o i-fly lang directly sa kanya
    map.flyTo(latLng, 18, { animate: true, duration: 1.5 });

    // 2. Buksan ang popup ng marker niya kung meron na
    if (technicianMarkers[t.id]) {
        technicianMarkers[t.id].openPopup();
    }

    // 3. I-update ang panel sa baba
    updateDetailPanel(t);

    // 4. Kung may user location na naka-set, iguhit agad ang route mula admin patungo sa tech
    if (userMarker) {
        drawRoute(userMarker.getLatLng(), latLng);
    }
}