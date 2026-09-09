/* ============================================================
 * HeavenLease — Notifications page module
 * Real backend notifications, mark-read + mark-all-read.
 * Extracted from notifications.html. Requires js/api.js + js/core.js.
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

    /* ===== REAL BACKEND NOTIFICATIONS ===== */
    const user = api.getUser();
    let notifications = [];

    async function loadNotifications() {
        try {
            let list = [];
            if (user && user.id) {
                list = await api.getNotificationsByUser(user.id).catch(() => []);
            } else {
                list = await api.getNotifications().catch(() => []);
            }
            return Array.isArray(list) ? list : [];
        } catch (e) {
            return [];
        }
    }

    function normalize(n) {
        return {
            id: n.id,
            read: !!n.read,
            unread: !n.read,
            title: n.title || 'Notification',
            text: n.message || '',
            time: n.createdAt,
            type: (n.type || 'INFO').toLowerCase(),
            icon: (n.type || 'INFO').includes('DOCUMENT') ? 'fa-file-shield' :
                ((n.type || 'INFO').toLowerCase() === 'error' ? 'fa-triangle-exclamation' : 'fa-bell'),
            link: 'home',
            linkText: 'View'
        };
    }

    function escapeHtml(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c])); }

    async function renderNotifications() {
        const list = document.getElementById('notifList');
        const empty = document.getElementById('emptyState');
        if (!list || !empty) return;
        notifications = await loadNotifications();

        if (!notifications.length) {
            list.innerHTML = '';
            empty.style.display = 'block';
            return;
        }

        empty.style.display = 'none';

        list.innerHTML = notifications.slice(0, 50).map((raw) => {
            const n = normalize(raw);
            const timeStr = n.time ? new Date(n.time).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
            return '<div class="notif-item ' + (n.unread ? 'unread' : '') + '">'
                + '<div class="notif-icon"><i class="fas ' + escapeHtml(n.icon) + '"></i></div>'
                + '<div class="notif-content">'
                + '<strong>' + escapeHtml(n.title) + '</strong>'
                + '<p>' + escapeHtml(n.text) + '</p>'
                + '<div class="notif-time"><i class="fas fa-clock"></i> ' + escapeHtml(timeStr) + '</div>'
                + '</div>'
                + '<a href="' + escapeHtml(n.link) + '" class="notif-link">' + escapeHtml(n.linkText) + ' →</a>'
                + '</div>';
        }).join('');
    }

    window.markRead = async function (id) {
        try { await api.markNotificationRead(id); } catch (e) { /* ignore */ }
        renderNotifications();
    };

    window.markAllRead = async function () {
        try {
            for (const n of notifications) {
                if (!n.read) await api.markNotificationRead(n.id).catch(() => { /* ignore */ });
            }
            showToast('All notifications marked as read.', 'success');
        } catch (e) { /* ignore */ }
        renderNotifications();
    };

    renderNotifications();
})();