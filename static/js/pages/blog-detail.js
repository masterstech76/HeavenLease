/* ============================================================
 * HeavenLease — Blog Detail page module
 * 1. Application-status widget (singleton booking or tenant list)
 * 2. Navbar scroll / profile menu wiring
 * Requires js/api.js + js/core.js loaded first.
 * ============================================================ */
(function () {
    'use strict';

    /* ===== Application status widget ===== */
    const wrap = document.getElementById('statusWrap');
    if (wrap) {
        const user = api.getUser();
        function badge(s) {
            const m = { 'pending': ['status-pending', 'Pending'], 'confirmed': ['status-active', 'Confirmed'],
                        'approved': ['status-active', 'Approved'], 'declined': ['status-inactive', 'Declined'],
                        'cancelled': ['status-inactive', 'Cancelled'], 'completed': ['status-completed', 'Completed'] };
            const x = m[(s || '').toLowerCase()] || ['status-inactive', s || '—'];
            return '<span class="status ' + x[0] + '">' + api.escapeHtml(x[1]) + '</span>';
        }
        function fmtDate(s) { if (!s) return '—'; const d = new Date(s); return isNaN(d.getTime()) ? String(s) : d; }
        const ORDER = ['pending', 'confirmed', 'declined', 'cancelled', 'completed'];
        const STEPS = [['pending', 'Submitted', 'Your request has been sent to the owner.'],
                       ['confirmed', 'Approved', 'The owner approved this request.'],
                       ['declined', 'Declined', 'The owner declined this request.'],
                       ['completed', 'Completed', 'This request has been completed.']];
        function card(b) {
            const cur = (b.status || 'pending').toLowerCase();
            const tl = STEPS.map(function (s) {
                const done = (ORDER.indexOf(s[0]) <= ORDER.indexOf(cur)) && cur !== 'declined' && cur !== 'cancelled';
                return '<div style="display:flex;gap:16px;align-items:flex-start;padding:14px 0;border-bottom:1px solid var(--gray-100);">'
                    + '<div style="width:36px;height:36px;border-radius:50%;background:' + (done ? 'var(--gradient)' : 'var(--gray-200)') + ';color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0;">'
                    + (done ? '<i class="fas fa-check"></i>' : '<i class="fas fa-circle"></i>') + '</div>'
                    + '<div><strong style="color:var(--dark);">' + s[1] + '</strong><div style="font-size:13px;color:var(--gray-500);margin-top:2px;">' + s[2] + '</div></div></div>';
            }).join('');
            wrap.innerHTML = '<div style="background:var(--white);border:1px solid var(--gray-200);border-radius:var(--radius-xl);padding:28px 30px;box-shadow:var(--shadow-sm);">'
                + '<div style="display:flex;justify-content:space-between;gap:14px;flex-wrap:wrap;align-items:center;margin-bottom:8px;">'
                + '<h3 style="color:var(--dark);margin:0;">' + api.escapeHtml(b.propertyTitle || ('Property #' + b.propertyId)) + '</h3>' + badge(b.status) + '</div>'
                + '<div style="font-size:13px;color:var(--gray-500);margin-bottom:20px;">Tour: ' + api.escapeHtml(fmtDate(b.tourDate)) + ' · ' + api.escapeHtml(b.tourTime || '') + ' · <a href="application-history">View all</a></div>'
                + tl + '</div>';
        }
        async function loadStatus() {
            try {
                const params = new URLSearchParams(window.location.search);
                const id = params.get('id');
                if (!user || !user.id) { wrap.innerHTML = '<div style="text-align:center;padding:40px;color:var(--gray-500);">Please log in to track your application.</div>'; return; }
                if (id) { const b = await api.getBooking(Number(id)); card(b); return; }
                let list = await api.getBookingsByTenant(user.id).catch(function () { return []; });
                if (!Array.isArray(list)) list = [];
                if (list.length === 0) {
                    wrap.innerHTML = '<div style="text-align:center;padding:60px 20px;background:var(--white);border:2px dashed var(--gray-200);border-radius:var(--radius-xl);">'
                        + '<i class="fas fa-hourglass-half" style="font-size:56px;color:var(--gray-300);"></i>'
                        + '<h3 style="margin:16px 0 6px;color:var(--dark);">No applications found</h3>'
                        + '<p style="color:var(--gray-500);margin-bottom:20px;">Apply to a property first and its status will appear here.</p>'
                        + '<a href="properties" class="btn btn-primary" style="display:inline-flex;gap:8px;"><i class="fas fa-building"></i> Browse Properties</a></div>';
                    return;
                }
                wrap.innerHTML = list.map(function (b) {
                    return '<a href="application-status?id=' + b.id + '" style="text-decoration:none;color:inherit;background:var(--white);border:1px solid var(--gray-200);border-radius:var(--radius-lg);padding:18px 22px;margin-bottom:12px;display:flex;justify-content:space-between;gap:14px;flex-wrap:wrap;align-items:center;box-shadow:var(--shadow-sm);">'
                        + '<div><strong style="color:var(--dark);">' + api.escapeHtml(b.propertyTitle || ('Property #' + b.propertyId)) + '</strong> ' + badge(b.status)
                        + '<div style="font-size:12px;color:var(--gray-400);margin-top:6px;">Tour: ' + api.escapeHtml(fmtDate(b.tourDate)) + ' · ' + api.escapeHtml(b.tourTime || '') + '</div></div>'
                        + '<i class="fas fa-chevron-right" style="color:var(--gray-400);"></i></a>';
                }).join('');
            } catch (e) {
                wrap.innerHTML = '<div style="text-align:center;padding:40px;color:var(--gray-500);">' + api.escapeHtml(e.message || 'Could not load status.') + '</div>';
            }
        }
        loadStatus();
    }

    /* ===== Navbar / profile menu ===== */
    const nav = document.getElementById('navbar');
    const btn = document.getElementById('profileBtn');
    const menu = document.getElementById('profileDropdown');
    const top = document.getElementById('backToTop');

    function onScroll() {
        if (nav) nav.classList.toggle('scrolled', window.scrollY > 18);
        if (top) top.classList.toggle('show', window.scrollY > 500);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    if (btn && menu) {
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            menu.classList.toggle('open');
        });
        document.addEventListener('click', function () {
            menu.classList.remove('open');
        });
    }

    if (top) {
        top.addEventListener('click', function () {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    try {
        const stored = api.getUser();
        const nm = stored && (stored.name || stored.fullName || stored.username);
        const target = document.getElementById('navUserName');
        if (nm && target) target.textContent = nm.split(' ')[0];
    } catch (e) { /* ignore */ }
})();