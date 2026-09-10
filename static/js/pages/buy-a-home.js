/* ============================================================
 * HeavenLease — buy-a-home page module
 * Public marketing page. Gates the account menu like the other
 * standalone pages: when logged out the dropdown is hidden and
 * the trigger becomes a "Sign In" button.
 * ============================================================ */
(function () {
    'use strict';
    document.addEventListener('DOMContentLoaded', function () {
        const btn = document.getElementById('profileBtn');
        const drop = document.getElementById('profileDropdown');
        if (!btn || !drop) return;

        const hasToken = !!(localStorage.getItem('heavenlease_token') || sessionStorage.getItem('heavenlease_token'));

        if (!hasToken) {
            drop.style.display = 'none';
            drop.classList.remove('open');
            const chevron = btn.querySelector('.fa-chevron-down');
            if (chevron) chevron.style.display = 'none';
            const nameEl = document.getElementById('navUserName') || btn.querySelector('#navUserName');
            if (nameEl) nameEl.textContent = 'Sign In';
            const avatar = btn.querySelector('.user-avatar');
            if (avatar) avatar.style.display = 'none';
            btn.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); window.location.href = 'login'; });
            return;
        }

        // Logged in: wire the toggle + real logout.
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            drop.classList.toggle('open');
        });
        document.addEventListener('click', function (e) {
            if (!e.target.closest('#userMenu')) drop.classList.remove('open');
        });
        const logout = document.getElementById('logoutLink');
        if (logout) {
            logout.addEventListener('click', function (e) {
                e.preventDefault();
                if (window.api) { api.setToken(null); api.setUser(null); }
                else { localStorage.removeItem('heavenlease_token'); localStorage.removeItem('heavenlease_user'); }
                window.location.href = 'login';
            });
        }
    });
})();