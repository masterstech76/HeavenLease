/* ============================================================
 * HeavenLease — Saved Properties page module
 * Loads the user's favorites (backend) + property details; renders
 * saved cards; remove favorite. Extracted from saved-properties.html.
 * Requires js/api.js + js/core.js (script.js) loaded first.
 * ============================================================ */
(function () {
    'use strict';

    const navbar = document.getElementById('navbar');
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.getElementById('navLinks');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50 && navbar) navbar.classList.add('scrolled');
        else if (navbar) navbar.classList.remove('scrolled');
    });
    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navLinks.classList.toggle('active');
        });
        document.querySelectorAll('.nav-link').forEach((link) => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                navLinks.classList.remove('active');
            });
        });
    }

    /* ===== Render saved properties (backend favorites + property cache) ===== */
    let savedCache = [];
    let apiFavoriteCache = [];

    function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c])); }

    function renderSaved() {
        const grid = document.getElementById('savedGrid');
        const empty = document.getElementById('emptyState');
        if (!grid || !empty) return;
        const countEl = document.getElementById('savedCount');
        if (countEl) countEl.textContent = savedCache.length;

        if (savedCache.length === 0) {
            grid.innerHTML = '';
            empty.style.display = 'block';
            return;
        }
        empty.style.display = 'none';

        grid.innerHTML = savedCache.map((p) => {
            const img = (p.photos && p.photos[0])
                ? '<img src="' + esc(p.photos[0]) + '" alt="' + esc(p.title) + '" style="width:100%;height:100%;object-fit:cover;">'
                : '<i class="fas ' + esc(p.icon || 'fa-building') + '"></i>';
            const amens = (Array.isArray(p.amenities) ? p.amenities : []).map((a) => '<span class="amenity">' + esc(a) + '</span>').join('');
            const price = (typeof formatPrice === 'function' ? formatPrice(p.price || p.rentAmount) : '₹' + Number(p.price || p.rentAmount || 0).toLocaleString('en-IN'));
            return '<div class="saved-card">'
                + '<div class="card-image">' + img
                + '<button class="remove-btn" onclick="removeSaved(' + p.id + ')" title="Remove from saved"><i class="fas fa-trash"></i></button></div>'
                + '<div class="card-body">'
                + '<h3>' + esc(p.title) + '</h3>'
                + '<p class="loc"><i class="fas fa-location-dot"></i> ' + esc(p.location) + '</p>'
                + '<div class="price">' + price + ' <small>/month</small></div>'
                + '<div class="amenities">' + amens + '</div>'
                + '<div class="card-actions">'
                + '<a href="property-detail?id=' + esc(p.id) + '" class="btn btn-primary"><i class="fas fa-calendar-check"></i> View</a>'
                + '<a href="messages?property=' + encodeURIComponent(p.title) + '" class="btn btn-outline"><i class="fas fa-comments"></i> Chat</a>'
                + '</div></div></div>';
        }).join('');
    }

    async function loadSaved() {
        savedCache = [];
        const user = api.getUser();
        let favIds = [];
        if (user && user.id) {
            try {
                const records = await api.getFavoritesByUser(user.id);
                favIds = (Array.isArray(records) ? records : []).map((f) => Number(f.propertyId));
                apiFavoriteCache = (Array.isArray(records) ? records : []).map((f) => ({ id: f.id, propertyId: Number(f.propertyId) }));
            } catch (e) {
                favIds = (typeof getFavorites === 'function') ? getFavorites() : [];
            }
        } else {
            favIds = (typeof getFavorites === 'function') ? getFavorites() : [];
        }
        const allProps = await (typeof fetchApiProperties === 'function' ? fetchApiProperties(0, 200) : Promise.resolve([])).catch(() => []);
        savedCache = allProps.filter((p) => favIds.includes(Number(p.id)));
        renderSaved();
    }

    window.removeSaved = async function (id) {
        const user = api.getUser();
        if (user && user.id) {
            const rec = apiFavoriteCache.find((f) => f.propertyId === Number(id));
            if (rec) { try { await api.removeFavorite(rec.id); } catch (e) { /* ignore */ } }
        } else if (typeof getFavorites === 'function' && typeof saveFavorites === 'function') {
            const favs = getFavorites().filter((f) => f !== Number(id));
            saveFavorites(favs);
        }
        savedCache = savedCache.filter((p) => Number(p.id) !== Number(id));
        renderSaved();
        showToast('Property removed from saved.', 'success');
    };

    loadSaved();
})();