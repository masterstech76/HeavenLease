/* ============================================================
 * HeavenLease — Tenant Management page module
 * Loads leases (admin → all, owner → by owner) and renders the
 * tenant roster. Extracted from tenant-management.html.
 * Requires js/api.js + js/core.js loaded first.
 * ============================================================ */
(function () {
    'use strict';

    const user = api.getUser();

    function badge(s) {
        const m = {
            active: ['status-completed', 'Active'],
            pending: ['status-pending', 'Pending'],
            completed: ['status-inactive', 'Completed'],
            terminated: ['status-inactive', 'Terminated'],
            expired: ['status-inactive', 'Expired']
        };
        const x = m[(s || '').toLowerCase()] || ['status-inactive', s || '—'];
        return '<span class="status ' + x[0] + '">' + api.escapeHtml(x[1]) + '</span>';
    }

    function fmtDate(s) {
        if (!s) return '—';
        const d = new Date(s);
        return isNaN(d.getTime()) ? api.escapeHtml(String(s)) : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    function money(n) {
        return '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN');
    }

    async function loadTenants() {
        const wrap = document.getElementById('tenantWrap');
        if (!wrap) return;

        try {
            if (!user || !user.id) {
                wrap.innerHTML = '<div class="tenant-message">Please log in as an owner to manage tenants.</div>';
                return;
            }

            const role = (user.role || '').toLowerCase();
            let list = [];
            if (role === 'admin') {
                list = (await api.getLeases().catch(() => [])) || [];
            } else if (role === 'owner' || role === 'verified_owner') {
                list = (await api.getLeasesByOwner(user.id).catch(() => [])) || [];
            } else {
                list = [];
            }
            if (!Array.isArray(list)) list = [];

            if (list.length === 0) {
                wrap.innerHTML = '<div class="tenant-empty">'
                    + '<div class="tenant-empty-icon"><i class="fas fa-users"></i></div>'
                    + '<h3>No tenants yet</h3>'
                    + '<p>When tenants sign leases on your properties, they appear here.</p>'
                    + '<a href="lease-signing" class="btn btn-primary"><i class="fas fa-file-signature"></i> Create a Lease</a>'
                    + '</div>';
                return;
            }

            wrap.innerHTML = list.map(function (l) {
                return '<article class="tenant-card">'
                    + '<div class="tenant-main">'
                    + '<div class="tenant-name-row">'
                    + '<span class="tenant-avatar"><i class="fas fa-user"></i></span>'
                    + '<span class="tenant-name">' + api.escapeHtml(l.tenantName || ('Tenant #' + l.tenantId)) + '</span>'
                    + badge(l.status)
                    + '</div>'
                    + '<div class="tenant-meta">'
                    + api.escapeHtml(l.propertyTitle || ('Property #' + l.propertyId))
                    + ' &nbsp;·&nbsp; ' + money(l.monthlyRent) + '/mo &nbsp;·&nbsp; Deposit ' + money(l.deposit)
                    + '<br>' + fmtDate(l.startDate) + ' <span aria-hidden="true">→</span> ' + fmtDate(l.endDate)
                    + '</div>'
                    + '</div>'
                    + '<div class="tenant-actions">'
                    + '<a class="btn btn-sm btn-secondary" href="lease-management"><i class="fas fa-file-contract"></i> Leases</a>'
                    + '<a class="btn btn-sm btn-secondary" href="messages"><i class="fas fa-comments"></i> Message</a>'
                    + '</div>'
                    + '</article>';
            }).join('');
        } catch (e) {
            wrap.innerHTML = '<div class="tenant-message">' + api.escapeHtml(e.message || 'Could not load tenants.') + '</div>';
        }
    }

    loadTenants();
})();