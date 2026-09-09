/* ============================================================
 * HeavenLease — Application History page module
 * Dual-mode: uses demo data (window.HL_DEMO_DATA.applications)
 * when present; otherwise loads real bookings + leases from the
 * backend for the signed-in user. No demo data lives in HTML.
 * Requires js/api.js + js/core.js loaded first.
 * ============================================================ */
(function () {
    'use strict';

    /* ===== Navbar: scrolled state + account dropdown ===== */
    const nav = document.getElementById('hlNav');
    const accountBtn = document.getElementById('accountBtn');
    const dropdown = document.getElementById('accountDropdown');
    if (accountBtn && dropdown) {
        accountBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const open = dropdown.classList.toggle('open');
            accountBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
        });
        document.addEventListener('click', () => dropdown.classList.remove('open'));
    }
    if (nav) {
        const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 20);
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
    }

    /* ===== Data + UI state ===== */
    const wrap = document.getElementById('historyWrap');
    const search = document.getElementById('searchInput');
    let applications = [];
    let filter = 'all';

    const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));

    function badge(s, label) {
        const cls = s === 'pending' ? 'status-pending' : (s === 'active' ? 'status-completed' : 'status-active');
        const icon = s === 'pending' ? 'fa-hourglass-half' : (s === 'active' ? 'fa-key' : 'fa-circle-check');
        return '<span class="status ' + cls + '"><i class="fas ' + icon + '"></i>' + esc(label) + '</span>';
    }

    function render() {
        if (!wrap) return;
        const q = (search ? search.value : '').trim().toLowerCase();
        const rows = applications.filter((a) => {
            const matchesFilter = filter === 'all'
                || (filter === 'pending' && a.status === 'pending')
                || (filter === 'approved' && a.status === 'confirmed')
                || (filter === 'active' && a.status === 'active');
            return matchesFilter && (!q || (a.title + ' ' + a.location).toLowerCase().includes(q));
        });
        if (!rows.length) {
            wrap.innerHTML = '<div class="empty"><div class="empty-icon"><i class="fas fa-folder-open"></i></div>'
                + '<h3>No matching applications</h3><p>Try another filter or search for a different property.</p>'
                + '<a class="btn btn-primary" href="properties"><i class="fas fa-building"></i> Browse Properties</a></div>';
            return;
        }
        wrap.innerHTML = rows.map((a) =>
            '<article class="application-card">'
            + '<div class="property-image"><img src="' + esc(a.image) + '" alt="' + esc(a.title) + '"><span class="image-tag"><i class="fas fa-house"></i> HeavenLease</span></div>'
            + '<div class="application-content">'
            + '<div class="card-top"><div><h3 class="property-title">' + esc(a.title) + '</h3>'
            + '<div class="location"><i class="fas fa-location-dot"></i>' + esc(a.location) + '</div></div>'
            + badge(a.status, a.statusLabel) + '</div>'
            + '<div class="card-meta">'
            + '<div class="meta-item"><span>Monthly rent</span><strong>' + esc(a.rent) + '</strong></div>'
            + '<div class="meta-item"><span>Property type</span><strong><i class="fas fa-building"></i>' + esc(a.type) + '</strong></div>'
            + '<div class="meta-item"><span>Application date</span><strong><i class="far fa-calendar"></i>' + esc(a.date) + '</strong></div>'
            + '<div class="meta-item"><span>Tour / lease</span><strong>' + esc(a.tour) + '</strong></div>'
            + '</div>'
            + '<div class="progress"><div class="progress-head"><span>Rental journey</span><strong>' + a.progress + '% complete</strong></div>'
            + '<div class="progress-track"><div class="progress-fill" style="width:' + a.progress + '%"></div></div></div>'
            + '<div class="card-actions"><span class="application-id">Reference ' + esc(a.id) + '</span><div class="actions">'
            + '<a class="btn btn-secondary" href="properties"><i class="fas fa-house"></i> View Property</a>'
            + '<a class="btn btn-primary" href="' + a.action + '?id=' + encodeURIComponent(a.id) + '"><i class="fas fa-arrow-right"></i> '
            + (a.status === 'active' ? 'View Lease' : 'Track Application') + '</a>'
            + '</div></div>'
            + '</div></article>').join('');
    }
/* ===== Summary counters ===== */
    function updateSummary() {
        const setNum = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
        setNum('summaryTotal', applications.length);
        setNum('summaryPending', applications.filter((a) => a.status === 'pending').length);
        setNum('summaryApproved', applications.filter((a) => a.status === 'confirmed').length);
        setNum('summaryActive', applications.filter((a) => a.status === 'active').length);
    }

    /* ===== Real-API mapping (bookings + leases → card shape) ===== */
    function statusLabel(s) {
        const m = { pending: 'Pending', confirmed: 'Confirmed', approved: 'Approved',
                    declined: 'Declined', cancelled: 'Cancelled', active: 'Active Lease', completed: 'Completed' };
        return m[(s || 'pending').toLowerCase()] || s || 'Pending';
    }
    function progressFor(s) {
        const m = { pending: 40, confirmed: 60, approved: 60, active: 100, completed: 100, declined: 10, cancelled: 10 };
        return m[(s || 'pending').toLowerCase()] || 20;
    }
    function fmtDate(s) {
        if (!s) return '—';
        const d = new Date(s);
        return isNaN(d.getTime()) ? String(s) : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
    }
    function mapBooking(b) {
        return {
            id: b.id || b.bookingId || ('B' + (b.propertyId || '—')),
            title: b.propertyTitle || ('Property #' + b.propertyId),
            location: [b.propertyCity, b.propertyLocality].filter(Boolean).join(', ') || 'Bengaluru',
            status: (b.status || 'pending').toLowerCase(),
            statusLabel: statusLabel(b.status),
            image: (Array.isArray(b.photos) && b.photos[0]) || 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=900&q=85',
            rent: b.rentAmount ? '₹' + Number(b.rentAmount).toLocaleString('en-IN') + ' / month' : '— / month',
            type: (b.bhk ? b.bhk + ' BHK' : 'Rental'),
            date: fmtDate(b.tourDate || b.createdAt),
            tour: b.tourTime || 'Tour requested',
            progress: progressFor(b.status),
            action: 'application-status'
        };
    }
    function mapLease(l) {
        return {
            id: l.id || ('L' + (l.propertyId || '—')),
            title: l.propertyTitle || ('Lease #' + l.id),
            location: [l.propertyCity, l.propertyLocality].filter(Boolean).join(', ') || '—',
            status: 'active',
            statusLabel: 'Active Lease',
            image: (Array.isArray(l.photos) && l.photos[0]) || 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=900&q=85',
            rent: l.rent ? '₹' + Number(l.rent).toLocaleString('en-IN') + ' / month' : '— / month',
            type: (l.bhk ? l.bhk + ' BHK' : 'Lease'),
            date: fmtDate(l.startDate || l.createdAt),
            tour: 'Lease active',
            progress: 100,
            action: 'lease-details'
        };
async function load() {
        /* 1) Demo mode (preferred only when demo data file exists) */
        const demo = window.HL_DEMO_DATA && window.HL_DEMO_DATA.applications;
        if ((typeof window.HL_USE_DEMO !== 'function' || window.HL_USE_DEMO()) && demo) {
            applications = demo;
            updateSummary();
            render();
            return;
        }
        /* 2) Real mode — signed-in tenant's bookings + leases */
        applications = [];
        if (window.api && typeof api.getUser === 'function') {
            const user = api.getUser();
            const uid = user && user.id;
            if (uid) {
                const bookings = (await api.getBookingsByTenant(uid).catch(() => [])) || [];
                const leases = (await api.getLeasesByTenant(uid).catch(() => [])) || [];
                applications = bookings.map(mapBooking).concat(leases.map(mapLease));
            }
        }
        updateSummary();
        render();
    }

    /* ===== Wire filters + search ===== */
    document.querySelectorAll('.filter-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
            filter = btn.dataset.filter;
            render();
        });
    });
    if (search) search.addEventListener('input', render);
    load();
})();
    }