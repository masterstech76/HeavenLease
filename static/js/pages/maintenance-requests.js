/* ============================================================
 * HeavenLease — Maintenance Requests (owner queue) module
 * Lists maintenance requests; owners start/mark-done/cancel.
 * Extracted from maintenance-requests.html.
 * Requires js/api.js + js/core.js loaded first.
 * ============================================================ */
(function () {
    'use strict';

    const user = api.getUser();
    if (user && user.role) {
        const link = document.getElementById('myProfileLink');
        if (link) link.href = 'edit-profile';
    }

    const wrap = document.getElementById('requestsWrap');
    if (!wrap) return;

    function statusBadge(status) {
        const map = {
            'OPEN': ['status-active', 'Open'],
            'IN_PROGRESS': ['status-pending', 'In Progress'],
            'DONE': ['status-completed', 'Done'],
            'CANCELLED': ['status-inactive', 'Cancelled'],
            'ESCROW_DISPUTED': ['status-pending', 'Disputed']
        };
        const m = map[status] || ['status-inactive', status || 'Unknown'];
        return '<span class="status ' + m[0] + '">' + api.escapeHtml(m[1]) + '</span>';
    }

    async function load() {
        try {
            let list = (await api.getMyMaintenanceRequests().catch(() => [])) || [];
            if (!Array.isArray(list)) list = [];

            if (list.length === 0) {
                wrap.innerHTML = '<div class="empty-card">'
                    + '<div class="state-icon"><i class="fas fa-toolbox"></i></div>'
                    + '<h3>No maintenance requests yet</h3>'
                    + '<p>When a tenant reports an issue it will show up here. You can also create a request manually to start tracking an issue.</p>'
                    + '<a href="maintenance-request" class="btn btn-primary"><i class="fas fa-plus"></i> New Request</a>'
                    + '</div>';
                return;
            }

            wrap.innerHTML = '<div class="request-list">' + list.map((r) => {
                const mineOwner = user && ['OWNER', 'VERIFIED_OWNER', 'ADMIN'].includes(user.role);
                const actions = [];
                if (mineOwner && r.status === 'OPEN') {
                    actions.push('<button class="btn btn-sm btn-secondary" onclick="setStatus(' + r.id + ',\'IN_PROGRESS\')"><i class="fas fa-play"></i> Start</button>');
                }
                if (mineOwner && (r.status === 'OPEN' || r.status === 'IN_PROGRESS')) {
                    actions.push('<button class="btn btn-sm btn-primary" onclick="setStatus(' + r.id + ',\'DONE\')"><i class="fas fa-check"></i> Mark Done</button>');
                    actions.push('<button class="btn btn-sm ghost" onclick="setStatus(' + r.id + ',\'CANCELLED\')"><i class="fas fa-ban"></i> Cancel</button>');
                }
                const propertyName = r.propertyTitle || ('Property #' + r.propertyId);

                return '<article class="request-card">'
                    + '<div class="request-main">'
                    + '<div class="request-content">'
                    + '<div class="request-title-row">'
                    + '<span class="request-title">' + api.escapeHtml(r.subject || 'Untitled') + '</span>'
                    + statusBadge(r.status)
                    + '</div>'
                    + '<p class="request-description">' + api.escapeHtml(r.description || 'No description provided.') + '</p>'
                    + '<div class="request-meta">'
                    + '<span><i class="fas fa-building"></i> ' + api.escapeHtml(propertyName) + '</span>'
                    + '<span><i class="fas fa-tags"></i> ' + api.escapeHtml(r.category || 'OTHER') + '</span>'
                    + '<span><i class="fas fa-gauge-high"></i> ' + api.escapeHtml(r.priority || 'NORMAL') + '</span>'
                    + (r.resolutionNote ? '<span><i class="fas fa-note-sticky"></i> ' + api.escapeHtml(r.resolutionNote) + '</span>' : '')
                    + (r.tenantName ? '<span><i class="fas fa-user"></i> ' + api.escapeHtml(r.tenantName) + '</span>' : '')
                    + (r.createdAt ? '<span><i class="fas fa-clock"></i> ' + api.escapeHtml(new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })) + '</span>' : '')
                    + '</div>'
                    + '</div>'
                    + (actions.length ? '<div class="request-actions">' + actions.join('') + '</div>' : '')
                    + '</div>'
                    + '</article>';
            }).join('') + '</div>';
        } catch (e) {
            wrap.innerHTML = '<div class="error-card">'
                + '<div class="state-icon"><i class="fas fa-triangle-exclamation"></i></div>'
                + '<h3>Could not load requests</h3>'
                + '<p>Something went wrong while loading the maintenance queue. Please refresh and try again.</p>'
                + '<button class="btn btn-primary" onclick="location.reload()"><i class="fas fa-rotate-right"></i> Try Again</button>'
                + '</div>';
        }
    }

    window.setStatus = async function (id, status) {
        const note = status === 'DONE' ? prompt('Resolution note (optional):') : '';
        try {
            await api.updateMaintenanceRequestStatus(id, status, note || '');
            showToast('Request updated to ' + status + '.', 'success');
            load();
        } catch (error) {
            showToast(error.message || 'Failed to update.', 'error');
        }
    };

    load();
})();