/* ============================================================
 * HeavenLease — Application Status page module
 * Loads the signed-in user's latest booking (or ?id=), renders
 * hero + status timeline card. Requires js/api.js + js/core.js.
 * ============================================================ */
(function () {
    'use strict';

    const nav = document.getElementById('navbar');
    const btn = document.getElementById('profileBtn');
    const drop = document.getElementById('profileDropdown');
    if (btn && drop) {
        btn.addEventListener('click', function (e) { e.stopPropagation(); drop.classList.toggle('open'); });
        document.addEventListener('click', function () { drop.classList.remove('open'); });
    }
    if (nav) window.addEventListener('scroll', function () { nav.classList.toggle('scrolled', window.scrollY > 20); });

    const user = (window.api && typeof api.getUser === 'function') ? api.getUser() : null;
    const wrap = document.getElementById('statusWrap');
    const demoStatus = (window.HL_DEMO_DATA && window.HL_DEMO_DATA.applicationStatus) || null;
    const steps = [
        ['pending', 'Submitted', 'Your rental request has been sent to the property owner.'],
        ['confirmed', 'Approved', 'The owner has approved your rental request.'],
        ['declined', 'Declined', 'The owner declined this rental request.'],
        ['completed', 'Completed', 'This application journey has been completed.']
    ];
    const order = ['pending', 'confirmed', 'approved', 'declined', 'cancelled', 'completed'];

    function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]; }); }
    function fmtDate(s) { if (!s) return '—'; const d = new Date(s); return isNaN(d.getTime()) ? String(s) : d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }); }
    function badge(s) {
        const x = (s || 'pending').toLowerCase();
        const map = { pending: ['pending', 'Pending', 'fa-hourglass-half'], confirmed: ['confirmed', 'Confirmed', 'fa-circle-check'], approved: ['approved', 'Approved', 'fa-circle-check'], declined: ['declined', 'Declined', 'fa-circle-xmark'], cancelled: ['cancelled', 'Cancelled', 'fa-ban'], completed: ['completed', 'Completed', 'fa-check-double'] };
        const m = map[x] || ['pending', s || 'Pending', 'fa-hourglass-half'];
        return '<span class="badge ' + m[0] + '"><i class="fas ' + m[2] + '"></i>' + esc(m[1]) + '</span>';
    }
    function card(b) {
        const cur = (b.status || 'pending').toLowerCase();
        const activeIndex = order.indexOf(cur);
        const declined = cur === 'declined' || cur === 'cancelled';
        const timeline = steps.map(function (s) {
            const idx = order.indexOf(s[0]);
            const done = !declined && idx >= 0 && activeIndex >= idx;
            const current = !declined && cur === s[0];
            return '<div class="timeline-step ' + (done ? 'done ' : '') + (current ? 'current' : '') + '"><div class="timeline-dot">' + (done ? '<i class="fas fa-check"></i>' : '<i class="fas fa-circle"></i>') + '</div><div><strong>' + s[1] + '</strong><p>' + s[2] + '</p></div></div>';
        }).join('');
        const title = b.propertyTitle || ('Property #' + b.propertyId);
        const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
        set('heroProperty', title);
        const heroLoc = document.getElementById('heroLocation');
        if (heroLoc) heroLoc.innerHTML = '<i class="fas fa-location-dot"></i> ' + esc(b.location || 'Your selected HeavenLease property');
        set('heroStep', cur === 'confirmed' || cur === 'approved' ? 'Approved by owner' : (cur === 'completed' ? 'Completed' : 'Application review'));
        set('heroNext', cur === 'pending' ? 'Owner review' : ((cur === 'confirmed' || cur === 'approved') ? 'Lease / move-in' : 'See application details'));
        const prog = document.getElementById('heroProgress');
        if (prog) prog.style.width = cur === 'completed' ? '100%' : ((cur === 'confirmed' || cur === 'approved') ? '68%' : '34%');

        wrap.innerHTML = '<article class="status-card">'
            + '<div class="status-card-top"><div><h3>' + esc(title) + '</h3><div class="property-meta"><i class="fas fa-location-dot"></i>' + esc(b.location || 'HeavenLease property') + '</div></div>' + badge(b.status) + '</div>'
            + '<div class="status-overview">'
            + '<div class="overview-item"><span>Tour date</span><strong>' + esc(fmtDate(b.tourDate)) + '</strong></div>'
            + '<div class="overview-item"><span>Tour time</span><strong>' + esc(b.tourTime || '—') + '</strong></div>'
            + '<div class="overview-item"><span>Reference</span><strong>HL-' + esc(b.id || b.propertyId || '—') + '</strong></div>'
            + '</div>'
            + '<div class="timeline">' + timeline + '</div>'
            + '<div class="card-actions"><a href="application-history" class="btn btn-secondary"><i class="fas fa-clock-rotate-left"></i> History</a><a href="properties" class="btn btn-primary"><i class="fas fa-house"></i> Browse Homes</a></div>'
            + '</article>';
    }
async function loadStatus() {
        if (!wrap) return;
        try {
            /* Demo mode (only when demo/demo-data.js is present; falls back to real API when deleted) */
            if ((typeof window.HL_USE_DEMO !== 'function' || window.HL_USE_DEMO()) && demoStatus) {
                card(demoStatus);
                return;
            }
            if (!window.api || typeof api.getBookingsByTenant !== 'function') {
                wrap.innerHTML = '<div class="state-card"><div class="state-icon"><i class="fas fa-file-circle-question"></i></div><h3>No applications found</h3><p>Apply to a property first and your application status will appear here.</p><a class="btn btn-primary" href="properties"><i class="fas fa-building"></i> Browse Properties</a></div>';
                return;
            }
            const params = new URLSearchParams(window.location.search), id = params.get('id');
            if (!user || !user.id) { wrap.innerHTML = '<div class="state-card"><div class="state-icon"><i class="fas fa-user-lock"></i></div><h3>Please sign in</h3><p>Log in to view the latest status of your rental application.</p><a class="btn btn-primary" href="login">Sign In</a></div>'; return; }
            if (id) { const b = await api.getBooking(Number(id)); if (!b) throw new Error('Application not found.'); card(b); return; }
            let list = await api.getBookingsByTenant(user.id).catch(() => []);
            if (!Array.isArray(list) || !list.length) {
                wrap.innerHTML = '<div class="state-card"><div class="state-icon"><i class="fas fa-file-circle-question"></i></div><h3>No applications found</h3><p>Apply to a property first and your application status will appear here.</p><a class="btn btn-primary" href="properties"><i class="fas fa-building"></i> Browse Properties</a></div>'; return;
            }
            card(list[0]);
        } catch (e) {
            wrap.innerHTML = '<div class="state-card"><div class="state-icon"><i class="fas fa-triangle-exclamation"></i></div><h3>Couldn’t load application status</h3><p>' + esc(e.message || 'Please try again.') + '</p><a class="btn btn-primary" href="application-status"><i class="fas fa-rotate"></i> Try Again</a></div>';
        }
    }
    loadStatus();
})();