/* ============================================================
 * HeavenLease — Account Settings module
 * Sidebar tabs, account overview (api.getMe), preferences (local),
 * and logout.
 * Extracted from account-settings.html.
 * Requires js/api.js + js/core.js loaded first.
 * ============================================================ */
(function () {
    'use strict';
    const $ = id => document.getElementById(id);
    const toast = $('toast');

    function showToast(msg) {
        if (!toast) return;
        toast.textContent = msg;
        toast.classList.add('show');
        clearTimeout(window.__asToast);
        window.__asToast = setTimeout(() => toast.classList.remove('show'), 2400);
    }
    function esc(v) {
        if (window.api && typeof api.escapeHtml === 'function') return api.escapeHtml(String(v ?? ''));
        return String(v ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
    }

    $('userBtn').addEventListener('click', e => { e.stopPropagation(); $('userMenu').classList.toggle('open'); });
    document.addEventListener('click', () => { const um = $('userMenu'); if (um) um.classList.remove('open'); });

    document.querySelectorAll('.as-side button').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.as-side button').forEach(x => x.classList.remove('active'));
            document.querySelectorAll('.as-panel').forEach(x => x.classList.remove('active'));
            btn.classList.add('active');
            $('panel-' + btn.dataset.tab).classList.add('active');
            /* Keep the URL clean — no # fragments for tab state */
        });
    });
    const hash = location.hash.replace('#', '');
    const hashBtn = document.querySelector('.as-side button[data-tab="' + hash + '"]');
    if (['account', 'preferences', 'security'].includes(hash) && hashBtn) hashBtn.click();

    async function loadAccount() {
        try {
            if (!window.api || typeof api.getMe !== 'function') throw new Error('Account API is unavailable.');
            const me = await api.getMe();
            if (!me || !me.id) { window.location.href = 'login'; return; }
            const display = me.fullName || me.username || 'HeavenLease User';
            const initial = display.trim().charAt(0).toUpperCase() || 'U';
            $('navName').textContent = display.split(/\s+/).slice(0, 2).join(' ');
            $('navAvatar').textContent = initial;
            $('bigAvatar').textContent = initial;
            $('fullName').textContent = display;
            $('username').textContent = me.username ? '@' + me.username : (me.email || '');
            $('email').textContent = me.email || '—';
            $('phone').textContent = me.phone || '—';
            $('role').textContent = (me.role || 'user').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            $('accountId').textContent = me.id;
            $('verifyBadge').innerHTML = me.verified ? '<i class="fas fa-circle-check"></i>&nbsp; Verified' : '<i class="fas fa-circle-exclamation"></i>&nbsp; Not verified';
            if (!me.verified) { $('verifyBadge').style.background = '#fffaeb'; $('verifyBadge').style.color = '#b54708'; }
            $('accountLoading').style.display = 'none';
            $('accountData').style.display = 'block';
        } catch (e) {
            const al = $('accountLoading');
            if (al) al.innerHTML = '<div style="color:#b42318"><i class="fas fa-triangle-exclamation"></i> ' + esc(e.message || 'Could not load account.') + '</div><div class="as-action-row" style="justify-content:center"><a class="as-btn as-btn-secondary" href="login">Return to sign in</a></div>';
        }
    }

    const defaults = { recommendations: true, searchAlerts: true, compact: false };
    function prefKey(k) { return 'heavenlease.account.preference.' + k; }
    function getPref(k) {
        const raw = localStorage.getItem(prefKey(k));
        return raw === null ? defaults[k] : raw === 'true';
    }
    function setPref(k, v) { localStorage.setItem(prefKey(k), String(v)); }
    document.querySelectorAll('.as-toggle').forEach(t => {
        const k = t.dataset.pref;
        const sync = () => t.classList.toggle('on', getPref(k));
        sync();
        t.addEventListener('click', () => { setPref(k, !getPref(k)); sync(); showToast((!getPref(k)) ? 'Preference disabled' : 'Preference enabled'); });
    });
    const resetPrefs = $('resetPrefs');
    if (resetPrefs) resetPrefs.addEventListener('click', () => {
        Object.keys(defaults).forEach(k => localStorage.removeItem(prefKey(k)));
        document.querySelectorAll('.as-toggle').forEach(t => t.classList.toggle('on', getPref(t.dataset.pref)));
        showToast('Preferences reset');
    });

    async function logout() {
        try {
            if (window.api && typeof api.logout === 'function') await api.logout();
            else { localStorage.removeItem('token'); localStorage.removeItem('authToken'); localStorage.removeItem('user'); sessionStorage.clear(); }
        } catch (e) { /* continue to redirect */ }
        window.location.href = 'login';
    }
    $('logoutBtn').addEventListener('click', e => { e.preventDefault(); logout(); });
    const secLogout = $('securityLogout');
    if (secLogout) secLogout.addEventListener('click', logout);

    loadAccount();
})();