/* ============================================================
 * HeavenLease — Property Map module (Leaflet)
 * Loads live properties onto an OpenStreetMap/CARTO basemap,
 * renders markers + sidebar list, and lets owners add a property
 * from the map. Extracted from map.html.
 * Requires Leaflet 1.9.4 + js/api.js + js/core.js first.
 * ============================================================ */
(function () {
    'use strict';

    const navbar = document.getElementById('navbar');
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.getElementById('navLinks');
    const backToTop = document.getElementById('backToTop');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) navbar.classList.add('scrolled');
        else navbar.classList.remove('scrolled');
        if (window.scrollY > 500) backToTop.classList.add('visible');
        else backToTop.classList.remove('visible');
    });
    if (hamburger) hamburger.addEventListener('click', () => { hamburger.classList.toggle('active'); navLinks.classList.toggle('active'); });
    if (hamburger && navLinks) document.querySelectorAll('.nav-link').forEach(link => link.addEventListener('click', () => { hamburger.classList.remove('active'); navLinks.classList.remove('active'); }));
    if (backToTop) backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

    function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c])); }

    /* ===== Live property data (real backend) ===== */
    let mapProperties = [];
    let nextId = 1;
    if (typeof fetchApiProperties === 'function') {
        fetchApiProperties(0, 200).then(list => {
            if (list && list.length > 0) { mapProperties = list; nextId = list.length + 1; renderAllProperties(); }
        }).catch(() => { /* keep empty */ });
    }

    /* ===== Initialize map ===== */
    const map = L.map('propertyMap').setView([20.5937, 78.9629], 5);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19,
        detectRetina: true
    }).addTo(map);

    let markers = [];
    const customIcon = L.divIcon({
        className: 'custom-marker',
        html: '<i class="fas fa-home" style="color: white; font-size: 12px; display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;"></i>',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });

/* ===== Render markers + sidebar ===== */
    function renderAllProperties() {
        markers.forEach(m => m.marker.remove());
        markers = [];
        const propertyList = document.getElementById('propertyList');
        const countEl = document.getElementById('count');
        if (countEl) countEl.textContent = '(' + mapProperties.length + ')';
        if (!propertyList) return;

        if (mapProperties.length === 0) {
            propertyList.innerHTML = '<div class="empty-state"><i class="fas fa-home"></i><p>No properties yet.<br>Be the first to add yours!</p></div>';
            return;
        }

        mapProperties.forEach(property => {
            const marker = L.marker([property.lat, property.lng], { icon: customIcon }).addTo(map);
            const ownerHtml = property.contactLocked
                ? '<br><span style="color:#B45309;"><i class="fas fa-lock"></i> Contact details locked</span><br><a href="payment" class="btn btn-primary" style="margin-top:6px;width:100%;"><i class="fas fa-unlock"></i> Unlock Contact</a>'
                : '<br><i class="fas fa-phone"></i> ' + esc(property.phone || '—') + '<br><i class="fas fa-envelope"></i> ' + esc(property.email || '—');
            const popupContent =
                '<div class="popup-content">'
                + '<h4>' + esc(property.title) + '</h4>'
                + '<div class="loc"><i class="fas fa-location-dot"></i> ' + esc(property.location || property.address) + '</div>'
                + '<div class="price">₹' + Number(property.price || 0).toLocaleString('en-IN') + '/month</div>'
                + '<div class="owner-info"><strong><i class="fas fa-user-check"></i> Owner:</strong> ' + esc(property.owner || 'Verified Owner') + ownerHtml + '</div>'
                + '<a href="property-detail?id=' + esc(property.id) + '" class="btn btn-primary" style="margin-top: 8px;"><i class="fas fa-eye"></i> View Details</a>'
                + '</div>';
            marker.bindPopup(popupContent);
            marker.on('click', () => {
                document.querySelectorAll('.map-property-item').forEach(item => item.classList.remove('active'));
                const listItem = document.querySelector('.map-property-item[data-id="' + property.id + '"]');
                if (listItem) listItem.classList.add('active');
            });
            markers.push({ marker: marker, property: property });
        });

        propertyList.innerHTML = mapProperties.map(property =>
            '<div class="map-property-item" data-id="' + esc(property.id) + '" onclick="focusProperty(' + esc(property.id) + ')">'
            + '<div class="mpi-title">' + esc(property.title) + '</div>'
            + '<div class="mpi-loc"><i class="fas fa-location-dot"></i> ' + esc(property.location || property.address || '') + '</div>'
            + '<div class="mpi-price">₹' + Number(property.price || 0).toLocaleString('en-IN') + '/month</div>'
            + '</div>'
        ).join('');
    }

    window.focusProperty = function (id) {
        const prop = mapProperties.find(p => String(p.id) === String(id));
        if (!prop) return;
        map.setView([prop.lat, prop.lng], 14);
        const marker = markers.find(m => String(m.property.id) === String(id));
        if (marker) marker.marker.openPopup();
        document.querySelectorAll('.map-property-item').forEach(item => item.classList.remove('active'));
        const li = document.querySelector('.map-property-item[data-id="' + id + '"]');
        if (li) li.classList.add('active');
    };
/* ===== Add-property form ===== */
    const addForm = document.getElementById('addPropertyForm');
    const cancelBtn = document.getElementById('cancelAddBtn');

    const addToggle = document.querySelector('.btn-add-property');
    if (addToggle && addForm) {
        addToggle.addEventListener('click', () => {
            addForm.classList.toggle('show');
            if (addForm.classList.contains('show')) addToggle.innerHTML = '<i class="fas fa-times"></i> Close Form';
            else addToggle.innerHTML = '<i class="fas fa-plus"></i> Add Your Property for Rent';
        });
    }
    if (cancelBtn && addForm) {
        cancelBtn.addEventListener('click', () => {
            addForm.classList.remove('show');
            if (addToggle) addToggle.innerHTML = '<i class="fas fa-plus"></i> Add Your Property for Rent';
        });
    }

    function geocodeCity(cityName) {
        const cityCoords = {
            'bengaluru': { lat: 12.9716, lng: 77.5946 },
            'hyderabad': { lat: 17.3850, lng: 78.4867 },
            'pune': { lat: 18.5204, lng: 73.8567 },
            'mumbai': { lat: 19.0760, lng: 72.8777 },
            'delhi': { lat: 28.6139, lng: 77.2090 },
            'kolkata': { lat: 22.5726, lng: 88.3639 },
            'chennai': { lat: 13.0827, lng: 80.2707 },
            'goa': { lat: 15.2993, lng: 74.1240 },
            'noida': { lat: 28.5355, lng: 77.3910 },
            'gurgaon': { lat: 28.4595, lng: 77.0266 },
            'jaipur': { lat: 26.9124, lng: 75.7873 },
            'lucknow': { lat: 26.8467, lng: 80.9462 },
            'ahmedabad': { lat: 23.0225, lng: 72.5714 }
        };
        const found = cityCoords[cityName.toLowerCase().trim()];
        return found || { lat: 20.5937 + (Math.random() * 2 - 1), lng: 78.9629 + (Math.random() * 4 - 2) };
    }

    function addPropertyToMap() {
        const g = (id) => { const el = document.getElementById(id); return el ? el.value : ''; };
        const title = g('propTitle').trim();
        const city = g('propCity').trim();
        const rent = g('propRent');
        const bhk = g('propBhk');
        const address = g('propAddress').trim();
        const owner = g('ownerName').trim();
        const phone = g('ownerPhone').trim();
        const email = g('ownerEmail').trim();

        if (!title || !city || !rent || !address || !owner || !phone || !email) {
            showToast('Please fill in all required fields.', 'error');
            return;
        }
        if (!api.isAuthenticated()) {
            showToast('Please sign in to list a property.', 'error');
            setTimeout(() => { window.location.href = 'login?redirect=map'; }, 1200);
            return;
        }

        const coords = geocodeCity(city);
        const payload = {
            title: title, address: address, city: city,
            rentAmount: Number(rent) || 0, deposit: 0, bhk: Number(bhk) || 0,
            propertyType: 'Apartment', locality: '', commute: 70,
            quietness: 75, sunlight: 80, petFriendly: false, furnished: false,
            lat: coords.lat, lng: coords.lng,
            ownerName: owner, ownerPhone: phone, ownerEmail: email,
            icon: 'fa-building', badge: 'Verified Owner', status: 'active'
        };

        const btn = document.querySelector('.btn-add-property');
        const original = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

        api.createProperty(payload)
            .then((saved) => {
                const created = Object.assign({}, payload, { id: saved && saved.id ? saved.id : Date.now() });
                mapProperties.unshift(created);
                renderAllProperties();
                map.setView([coords.lat, coords.lng], 13);
                const newMarker = markers.find(m => String(m.property.id) === String(created.id));
                if (newMarker) newMarker.marker.openPopup();

                ['propTitle', 'propCity', 'propRent', 'propBhk', 'propAddress', 'ownerName', 'ownerPhone', 'ownerEmail'].forEach((id) => {
                    const el = document.getElementById(id); if (el) el.value = '';
                });
                if (addForm) addForm.classList.remove('show');
                btn.innerHTML = original;
                btn.disabled = false;
                showToast('Your property has been listed! It now appears on the map.', 'success');
            })
            .catch((err) => {
                btn.innerHTML = original;
                btn.disabled = false;
                showToast((err && err.message) || 'Could not list your property. Please try again.', 'error');
            });
    }

    const addToMapBtn = document.getElementById('addToMapBtn');
    if (addToMapBtn) addToMapBtn.addEventListener('click', addPropertyToMap);

    /* ===== Initialize ===== */
    renderAllProperties();
})();