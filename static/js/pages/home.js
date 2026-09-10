/* ============================================================
 * HeavenLease — Main Home (role hub) page module
 * 1. Auth guard + role-aware hub filtering
 * 2. Natural-language search → properties page
 * 3. Presentation: search chips, welcome message
 * Requires js/api.js + js/core.js loaded first.
 * ============================================================ */
(function () {
    'use strict';

    /* ===== Auth guard ===== */
    if (!api.isAuthenticated()) {
        window.location.href = 'login';
        return;
    }
    const user = api.getUser() || {};

    /* ===== Role-aware hub ===== */
    (function filterHubByRole() {
        const role = (user.role || '').toUpperCase();
        const isOwner = role === 'OWNER' || role === 'VERIFIED_OWNER';
        const isAdmin = role === 'ADMIN';
        document.querySelectorAll('.hub-category[data-role]').forEach(cat => {
            const need = cat.getAttribute('data-role');
            const visible = isAdmin
                || need === 'both'
                || (need === 'owner' && isOwner)
                || (need === 'tenant' && !isOwner);
            if (!visible) cat.style.display = 'none';
        });
        const heroListBtn = document.querySelector('.hero-cta a[href="list-property"]');
        if (heroListBtn && !isOwner) heroListBtn.style.display = 'none';
    })();

    /* ===== Role-aware dashboard card ===== */
    const myDashboardCard = document.getElementById('myDashboardCard');
    if (myDashboardCard) {
        myDashboardCard.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = 'dashboard';
        });
    }

    const name = user.fullName || user.name || '';
    const initial = (name.trim().charAt(0) || 'U').toUpperCase();

    const profileLink = document.getElementById('myProfileLink');
    if (profileLink) profileLink.href = 'edit-profile';

    if (name) {
        const el = document.getElementById('navUserName');
        const icon = document.getElementById('navAvatarIcon');
        if (el) el.textContent = name.split(' ').slice(0, 2).join(' ');
        if (icon) icon.className = 'fas fa-user-circle';
    }
    const avatar = document.querySelector('#profileBtn .user-avatar');
    if (avatar && name) avatar.textContent = initial;
    if (avatar && !name) avatar.innerHTML = '<i class="fas fa-user"></i>';

    const welcome = document.getElementById('welcomeMsg');
    if (welcome) {
        const role = (user.role || '').toLowerCase();
        const base = name ? 'Hi ' + name.split(' ')[0] + ' — ' : 'Welcome — ';
        welcome.textContent = role === 'owner'
            ? base + 'manage your listings, rents and tenants right from here.'
            : base + 'find your perfect home and track your applications here.';
    }

    /* ===== Amazon-style data feed (rails + dense grid) ===== */
    const esc = (typeof escapeHtml === 'function') ? escapeHtml : function (s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
        });
    };
    const KNOWN_CITIES = ['Mumbai', 'Pune', 'Bengaluru', 'Nashik', 'Delhi', 'Hyderabad', 'Chennai', 'Kolkata', 'Jaipur', 'Ahmedabad'];

    function renderCard(property) {
        if (typeof renderPropertyCard === 'function') return renderPropertyCard(property, { showActions: false });
        const p = property;
        const img = (p.photos && p.photos[0]) || 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1000&q=85';
        return '<article class="property-card fade-in-up" data-id="' + esc(p.id) + '">'
            + '<div class="property-image"><div class="property-image-placeholder"><img src="' + img + '" alt="' + esc(p.title || 'Property') + '" loading="lazy" style="width:100%;height:100%;object-fit:cover;"></div>'
            + '<span class="property-badge"><i class="fas fa-check-circle"></i> ' + esc(p.badge || 'Verified Owner') + '</span></div>'
            + '<div class="property-body"><h3 class="property-title">' + esc(p.title) + '</h3>'
            + '<p class="property-location"><i class="fas fa-location-dot"></i> ' + esc(p.location) + '</p>'
            + '<div class="property-price"><span class="price">₹' + Number(p.price || 0).toLocaleString('en-IN') + '</span><span class="per-month">/month</span></div>'
            + '</div></article>';
    }

    function wireFavButtons(el) {
        if (!el) return;
        el.querySelectorAll('.property-favorite').forEach(function (btn) {
            if (btn.dataset.wired) return;
            btn.dataset.wired = '1';
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                if (typeof toggleFavorite === 'function') toggleFavorite(e);
                else window.location.href = 'login?redirect=properties';
            });
        });
    }

    function renderRail(el, list) {
        if (!el) return;
        if (!list || !list.length) { el.innerHTML = ''; if (el.parentElement) el.parentElement.classList.add('empty'); return; }
        el.innerHTML = list.map(renderCard).join('');
        wireFavButtons(el);
        if (el.parentElement) el.parentElement.classList.remove('empty');
    }

    function renderFeed(list) {
        const feed = document.getElementById('propertyFeed');
        if (!feed) return;
        if (!list || !list.length) {
            feed.innerHTML = '<div class="no-results" style="grid-column:1/-1;"><i class="fas fa-search"></i><h3>No homes listed yet</h3><p>Check back soon — new verified listings are added every day.</p><a href="list-property" class="btn btn-primary"><i class="fas fa-plus"></i> List your property</a></div>';
            return;
        }
        feed.innerHTML = list.map(renderCard).join('');
        wireFavButtons(feed);
    }

    function renderCityRail(list) {
        const rail = document.getElementById('cityRail');
        if (!rail) return;
        const cities = [];
        (list || []).forEach(function (p) { const c = (p.city || '').trim(); if (c && cities.indexOf(c) < 0) cities.push(c); });
        const merged = cities.length ? cities : KNOWN_CITIES;
        rail.innerHTML = merged.slice(0, 8).map(function (c) {
            return '<a class="category-pill" href="properties?location=' + encodeURIComponent(c) + '">' + esc(c) + '</a>';
        }).join('') + '<a class="category-pill pill-more" href="properties">All cities <i class="fas fa-arrow-right"></i></a>';
    }

    let feedShown = false;
    function renderFeedAll(list) {
        list = list || [];
        renderRail(document.getElementById('railRecommended'), list.slice(0, 6));
        renderRail(document.getElementById('railFresh'), list.slice(0, 8));
        renderCityRail(list);
        if (!feedShown) { renderFeed(list); feedShown = true; }
    }

    if (window.HL_DEMO_DATA && Array.isArray(window.HL_DEMO_DATA.properties)) {
        renderFeedAll(window.HL_DEMO_DATA.properties);
    } else if (typeof fetchApiProperties === 'function') {
        fetchApiProperties(0, 100).then(function (list) {
            renderFeedAll(list && list.length ? list : []);
        }).catch(function () { renderFeedAll([]); });
    } else {
        renderFeedAll([]);
    }

    /* ===== Natural-language search → properties ===== */
    function parseQueryToParams(q) {
        q = (q || '').toLowerCase();
        const params = {};
        const bhkMatch = q.match(/(\d)\s*bhk/);
        if (bhkMatch) params.bhk = bhkMatch[1];
        const budgetMatch = q.match(/under\s*₹?([\d,]+)/);
        if (budgetMatch) {
            const amt = parseInt(budgetMatch[1].replace(/,/g, ''), 10);
            if (amt <= 10000) params.budget = '10000';
            else if (amt <= 20000) params.budget = '20000';
            else if (amt <= 30000) params.budget = '30000';
            else if (amt <= 50000) params.budget = '50000';
            else params.budget = '100000';
        }
        const cities = ['bengaluru', 'bangalore', 'hyderabad', 'pune', 'mumbai', 'delhi', 'noida', 'gurgaon', 'gurugram', 'kolkata', 'chennai', 'goa', 'jaipur', 'lucknow', 'ahmedabad'];
        for (const c of cities) {
            if (q.includes(c)) { params.location = (c === 'bangalore' ? 'bengaluru' : c); break; }
        }
        if (!params.location) {
            const cleaned = q.replace(/\d+\s*bhk/, '').replace(/under\s*₹?[\d,]+/, '').replace(/rent|properties|in|for|homes?/g, '').trim();
            if (cleaned && cleaned.length < 24) params.location = cleaned;
        }
        if (q.includes('buy') || q.includes('sale')) params.type = q.includes('buy') ? 'buy' : 'sale';
        return params;
    }

    function goSearch(q) {
        const params = parseQueryToParams(q);
        const qs = new URLSearchParams();
        if (params.location) qs.set('location', params.location);
        if (params.budget) qs.set('budget', params.budget);
        if (params.bhk) qs.set('bhk', params.bhk);
        if (params.type) qs.set('type', params.type);
        const target = 'properties' + (qs.toString() ? '?' + qs.toString() : '');
        window.location.href = target;
    }
    window.goSearch = goSearch;

    const searchBox = document.getElementById('searchBox');
    if (searchBox) {
        searchBox.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const v = searchBox.value.trim();
                if (!v) { window.location.href = 'properties'; return; }
                goSearch(v);
            }
        });
    }

    /* ===== Search form + chips ===== */
    const form = document.getElementById('homeSearchForm');
    const input = document.getElementById('searchBox');
    if (form && input) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            const value = input.value.trim();
            if (value) goSearch(value);
            else window.location.href = 'properties';
        });
        document.querySelectorAll('.search-chip').forEach(function (chip) {
            chip.addEventListener('click', function () {
                input.value = chip.dataset.query || '';
                input.focus();
            });
        });
    }
})();