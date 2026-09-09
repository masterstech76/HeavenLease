/* ============================================================
 * HeavenLease — Lease Management page module
 * Loads the signed-in user's leases (owner → by owner, tenant →
 * by tenant, admin → all) from the backend and renders them into
 * the <div id="leaseWrap"> using the page's .lease-item styles.
 * Requires js/api.js + js/core.js loaded first.
 * ============================================================ */
(function () {
    'use strict';

    const wrap = document.getElementById('leaseWrap');
    if (!wrap) return;

    const user = (window.api && typeof api.getUser === 'function') ? api.getUser() : null;
    const role = ((user && user.role) || '').toLowerCase();
    const isOwner = role === 'owner' || role === 'verified_owner' || role === 'admin';

    function badge(s) {
        const map = { 'active': ['status-completed', 'Active'], 'pending': ['status-pending', 'Pending'],
                      'completed': ['status-inactive', 'Completed'], 'terminated': ['status-inactive', 'Terminated'],
                      'expired': ['status-inactive', 'Expired'] };
        const m = map[(s || '').toLowerCase()] || ['status-inactive', s || '—'];
        return '<span class="status ' + m[0] + '">' + api.escapeHtml(m[1]) + '</span>';
    }
    function fmtDate(s) {
        if (!s) return '—';
        const d = new Date(s);
        return isNaN(d.getTime()) ? String(s) : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    function money(n) {
        return '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN');
    }

    async function loadLeases() {
        try {
            let list = [];
            if (role === 'admin') list = (await api.getLeases().catch(() => [])) || [];
            else if (isOwner && user && user.id) list = (await api.getLeasesByOwner(user.id).catch(() => [])) || [];
            else if (user && user.id) list = (await api.getLeasesByTenant(user.id).catch(() => [])) || [];

            if (!list.length) {
                wrap.innerHTML = '<div class="empty-state"><i class="fas fa-file-contract"></i>'
                    + '<h3>No leases yet</h3>'
                    + '<p>Leases created by owners appear here with status and key dates.</p>'
                    + '<a href="lease-signing" class="btn btn-primary" style="display:inline-flex;gap:8px;"><i class="fas fa-file-signature"></i> Start a Lease</a></div>';
                return;
            }

            wrap.innerHTML = list.map((l) => {
                const viewBtn = '<a class="btn lease-view" href="lease-details?id=' + l.id + '"><i class="fas fa-eye"></i> View</a>';
                const completeBtn = isOwner
                    ? '<button type="button" class="btn lease-complete" onclick="window.leaseAction(' + l.id + ',\'completed\')"><i class="fas fa-check"></i> Complete</button>'
                    : '';
                return '<div class="lease-item">'
                    + '<div class="lease-main">'
                    + '<div class="lease-title-row"><h3 class="lease-title">' + api.escapeHtml(l.propertyTitle || ('Lease #' + l.id)) + '</h3>' + badge(l.status) + '</div>'
                    + '<div class="lease-meta">'
                    + '<span><i class="fas fa-user"></i> ' + api.escapeHtml(l.tenantName || ('Tenant #' + l.tenantId)) + '</span>'
                    + '<span><i class="fas fa-indian-rupee-sign"></i> ' + money(l.monthlyRent || l.rent) + ' rent</span>'
                    + '<span><i class="fas fa-shield-halved"></i> ' + money(l.deposit) + ' deposit</span>'
                    + '</div>'
                    + '<div class="lease-dates"><i class="fas fa-calendar"></i> ' + fmtDate(l.startDate) + ' → ' + fmtDate(l.endDate) + '</div>'
                    + '</div>'
                    + '<div class="lease-actions">' + viewBtn + completeBtn + '</div>'
                    + '</div>';
            }).join('');
        } catch (e) {
            wrap.innerHTML = '<div class="error-state"><i class="fas fa-triangle-exclamation"></i>'
                + '<h3>Could not load leases</h3><p>' + api.escapeHtml(e.message || 'Please try again shortly.') + '</p></div>';
        }
    }

    window.leaseAction = async function (id, status) {
        try {
            await api.updateLeaseStatus(id, status);
            if (typeof showToast === 'function') showToast('Lease updated.', 'success');
            loadLeases();
        } catch (e) {
            if (typeof showToast === 'function') showToast(e.message || 'Action failed.', 'error');
        }
    };

    loadLeases();
})();