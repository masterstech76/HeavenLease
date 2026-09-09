/* ============================================================
 * HeavenLease — Lease Templates module
 * Support help form (mailto) + navbar/hamburger/back-to-top.
 * Extracted from lease-templates.html.
 * Requires js/api.js + js/core.js loaded first.
 * ============================================================ */
(function () {
    'use strict';

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
        const subject = encodeURIComponent('HeavenLease page enquiry');
        const body = encodeURIComponent(msg + (email ? '\n\nReply to: ' + email : ''));
        window.location.href = 'mailto:support@heavenlease.in?subject=' + subject + '&body=' + body;
        setTimeout(function () { if (note) note.textContent = 'Opening your email app to send the message - thank you!'; }, 400);
    };

    const navbar = document.getElementById('navbar');
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.getElementById('navLinks');
    const backToTop = document.getElementById('backToTop');

    if (navbar && backToTop) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) navbar.classList.add('scrolled');
            else navbar.classList.remove('scrolled');
            if (window.scrollY > 500) backToTop.classList.add('visible');
            else backToTop.classList.remove('visible');
        });
    }
    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navLinks.classList.toggle('active');
        });
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                navLinks.classList.remove('active');
            });
        });
    }
    if (backToTop) {
        backToTop.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
})();