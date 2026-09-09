/* ============================================================
 * HeavenLease — Background Check module
 * Navbar/profile dropdown, back-to-top, user greeting, and
 * the mailto support form. Extracted from background-check.html.
 * Requires js/api.js + js/core.js loaded first.
 * ============================================================ */
(function () {
    'use strict';

    const navbar = document.getElementById('navbar');
    const profileBtn = document.getElementById('profileBtn');
    const dropdown = document.getElementById('profileDropdown');
    const topBtn = document.getElementById('top');

    if (profileBtn && dropdown) {
        profileBtn.addEventListener('click', e => { e.stopPropagation(); dropdown.classList.toggle('open'); });
        document.addEventListener('click', () => dropdown.classList.remove('open'));
    }
    if (navbar && topBtn) {
        window.addEventListener('scroll', () => {
            navbar.classList.toggle('scrolled', scrollY > 20);
            topBtn.classList.toggle('visible', scrollY > 500);
        });
        topBtn.addEventListener('click', () => scrollTo({ top: 0, behavior: 'smooth' }));
    }

    try {
        if (window.api && api.getUser) {
            const u = api.getUser();
            const el = document.getElementById('navUserName');
            if (u && el) el.textContent = u.name || u.fullName || u.email || 'Account';
        }
    } catch (e) { /* non-critical */ }

    window.clearHelpMessage = function () {
        const msg = document.getElementById('helpMessage');
        const em = document.getElementById('helpEmail');
        const note = document.getElementById('helpNote');
        if (msg) msg.value = '';
        if (em) em.value = '';
        if (note) note.textContent = 'Messages go to our support team by email. Prefer email? Write to support@heavenlease.in';
    };

    window.sendHelpMessage = function () {
        const msgEl = document.getElementById('helpMessage');
        const msg = (msgEl && msgEl.value || '').trim();
        const em = document.getElementById('helpEmail');
        const email = (em && em.value || '').trim();
        const note = document.getElementById('helpNote');
        if (!msg) { if (note) note.textContent = 'Please type a short message first.'; return; }
        location.href = 'mailto:support@heavenlease.in?subject=' + encodeURIComponent('HeavenLease background check enquiry') + '&body=' + encodeURIComponent(msg + (email ? '\n\nReply to: ' + email : ''));
        setTimeout(() => { if (note) note.textContent = 'Opening your email app to send the message — thank you!'; }, 400);
    };
})();