/* ============================================================
 * HeavenLease — About module
 * Account-aware navbar, FAQ accordion, animated public stats,
 * and a lightweight mobile drawer.
 * Extracted from about.html.
 * Requires js/api.js + js/core.js loaded first.
 * ============================================================ */
(() => {
    'use strict';
    const $ = (id) => document.getElementById(id);
    const nav = $('hlNav');
    const accountBtn = $('accountBtn');
    const dropdown = $('accountDropdown');
    const toast = $('toast');

    function showToast(message) {
        if (!toast) return;
        toast.textContent = message;
        toast.classList.add('show');
        clearTimeout(window.__hlToastTimer);
        window.__hlToastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
    }

    window.addEventListener('scroll', () => nav?.classList.toggle('scrolled', window.scrollY > 20));

    accountBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        const open = dropdown.classList.toggle('open');
        accountBtn.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('click', () => {
        dropdown?.classList.remove('open');
        accountBtn?.setAttribute('aria-expanded', 'false');
    });
    dropdown?.addEventListener('click', e => e.stopPropagation());

    document.querySelectorAll('.hl-faq-q').forEach(button => {
        button.addEventListener('click', () => {
            const item = button.closest('.hl-faq-item');
            document.querySelectorAll('.hl-faq-item.open').forEach(other => {
                if (other !== item) other.classList.remove('open');
            });
            item.classList.toggle('open');
        });
    });

    // Keep this page public. Authenticated users get account-aware navigation;
    // guests can still read the About page and use public property routes.
    let user = {};
    try {
        if (window.api && typeof api.getUser === 'function') user = api.getUser() || {};
    } catch (_) { /* keep empty */ }

    const name = user.fullName || user.name || '';
    const first = name.trim().split(/\s+/)[0] || 'Guest';
    const initial = (first[0] || 'G').toUpperCase();
    const navUserName = $('navUserName');
    const navAvatar = $('navAvatar');
    if (navUserName) navUserName.textContent = first;
    if (navAvatar) navAvatar.textContent = initial;

    const signedIn = !!(window.api && typeof api.isAuthenticated === 'function' && api.isAuthenticated());
    const setStyle = (id, value) => { const el = $(id); if (el) el.style.display = value; };
    setStyle('guestSignIn', signedIn ? 'none' : 'flex');
    setStyle('dashboardLink', signedIn ? 'flex' : 'none');
    setStyle('profileLink', signedIn ? 'flex' : 'none');
    setStyle('logoutLink', signedIn ? 'flex' : 'none');

    // Let the existing global script own logout behavior if it already binds it.
    // If not, provide a safe fallback for common local/session storage auth.
    $('logoutLink')?.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
            if (window.api && typeof api.logout === 'function') await api.logout();
            else {
                localStorage.removeItem('token');
                localStorage.removeItem('authToken');
                localStorage.removeItem('user');
                sessionStorage.clear();
            }
        } catch (_) { /* continue to redirect */ }
        window.location.href = 'login';
    });
async function loadStats() {
        const ids = ['statProperties', 'statTenants', 'statOwners', 'statCities'];
        const fields = ['properties', 'tenants', 'verifiedOwners', 'cities'];
        let stats = null;

        try {
            if (window.api && typeof api.getPublicStats === 'function') {
                stats = await api.getPublicStats();
            }
        } catch (_) {
            showToast('Live stats are temporarily unavailable.');
        }

        const targets = ids.map((id, i) => Number(stats?.[fields[i]] || 0));

        const animate = (el, target) => {
            const start = performance.now();
            const duration = 1300;
            const tick = now => {
                const p = Math.min((now - start) / duration, 1);
                const eased = 1 - Math.pow(1 - p, 3);
                el.textContent = Math.floor(target * eased).toLocaleString('en-IN');
                if (p < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        };

        const panel = $('statsPanel');
        if (!panel) return;
        const observer = new IntersectionObserver(entries => {
            if (!entries[0].isIntersecting) return;
            ids.forEach((id, i) => {
                const el = $(id);
                if (el) animate(el, targets[i]);
            });
            observer.disconnect();
        }, { threshold: .35 });
        observer.observe(panel);
    }

    loadStats();

    // Mobile navigation: reuse the existing route list in a lightweight drawer.
    $('mobileBtn')?.addEventListener('click', () => {
        const existing = document.querySelector('.hl-mobile-drawer');
        if (existing) { existing.remove(); return; }
        const drawer = document.createElement('div');
        drawer.className = 'hl-mobile-drawer';
        drawer.style.cssText = 'position:fixed;z-index:999;top:72px;left:14px;right:14px;background:#fff;border:1px solid #e6eaf0;border-radius:16px;padding:10px;box-shadow:0 20px 50px rgba(16,24,40,.15)';
        drawer.innerHTML = `
            <a href="properties" style="display:block;padding:12px;color:#3a4354;font-weight:700;font-size:13px">Find a Home</a>
            <a href="map" style="display:block;padding:12px;color:#3a4354;font-weight:700;font-size:13px">Property Map</a>
            <a href="how-it-works" style="display:block;padding:12px;color:#3a4354;font-weight:700;font-size:13px">How It Works</a>
            <a href="#faq" style="display:block;padding:12px;color:#3a4354;font-weight:700;font-size:13px">FAQ</a>`;
        document.body.appendChild(drawer);
    });
})();