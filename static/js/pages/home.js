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