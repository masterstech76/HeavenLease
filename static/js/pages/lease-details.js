/* ============================================================
 * HeavenLease — Lease Details page module
 * Loads a lease (?id=) from the backend and renders the full
 * agreement cards. Extracted from lease-details.html.
 * Requires js/api.js + js/core.js loaded first.
 * ============================================================ */
(function () {
    'use strict';

    const wrap = document.getElementById('leaseWrap');
    if (!wrap) return;

    function esc(value) {
        return api.escapeHtml(value == null ? '—' : String(value));
    }

    function fmt(value) {
        if (!value) return '—';
        const d = new Date(value);
        return isNaN(d.getTime()) ? esc(value) : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    function money(value) {
        return '₹' + Math.round(Number(value) || 0).toLocaleString('en-IN');
    }

    function statusInfo(status) {
        const key = String(status || '').toLowerCase();
        const map = {
            active: ['Active', 'status-completed'],
            pending: ['Pending', 'status-pending'],
            completed: ['Completed', 'status-inactive'],
            terminated: ['Terminated', 'status-inactive'],
            expired: ['Expired', 'status-inactive']
        };
        return map[key] || [status || 'Unknown', 'status-inactive'];
    }

    function detailRow(label, value, className) {
        return '<div class="detail-row">'
            + '<span class="detail-label">' + esc(label) + '</span>'
            + '<strong class="detail-value ' + (className || '') + '">' + esc(value) + '</strong>'
            + '</div>';
    }

    function infoCard(icon, title, rows) {
        return '<article class="info-card">'
            + '<h3><i class="fas ' + icon + '"></i>' + esc(title) + '</h3>'
            + rows.join('')
            + '</article>';
    }

    async function loadLease() {
        const q = new URLSearchParams(window.location.search);
        const id = q.get('id');

        if (!id) {
            wrap.innerHTML = '<div class="lease-error">'
                + '<i class="fas fa-file-circle-exclamation"></i>'
                + '<h3>No lease selected</h3>'
                + '<p>Choose a lease from your lease management area to view its details.</p>'
                + '<a href="lease-management" class="btn btn-primary">View all leases</a>'
                + '</div>';
            return;
        }

        try {
            const l = await api.getLease(Number(id));

            if (!l || !l.id) {
                wrap.innerHTML = '<div class="lease-error">'
                    + '<i class="fas fa-file-circle-xmark"></i>'
                    + '<h3>Lease not found</h3>'
                    + '<p>The requested lease could not be found or may no longer be available.</p>'
                    + '<a href="lease-management" class="btn btn-primary">Back to leases</a>'
                    + '</div>';
                return;
            }

            const status = statusInfo(l.status);
            const property = l.propertyTitle || ('Property #' + (l.propertyId || '—'));
            const tenant = l.tenantName || ('Tenant #' + (l.tenantId || '—'));
            const owner = l.ownerName || ('Owner #' + (l.ownerId || '—'));

            wrap.innerHTML =
                '<div class="lease-shell">'
                + '<article class="lease-card">'
                + '<div class="lease-top">'
                + '<div>'
                + '<div class="lease-eyebrow">Lease agreement</div>'
                + '<h3 class="lease-title">' + esc(property) + '</h3>'
                + '<div class="lease-id">Lease ID · #HL-' + esc(l.id) + '</div>'
                + '</div>'
                + '<span class="lease-status">' + esc(status[0]) + '</span>'
                + '</div>'
                + '<div class="lease-summary">'
                + '<div class="summary-item"><span class="summary-label">Monthly rent</span><strong class="summary-value">' + money(l.monthlyRent) + '</strong></div>'
                + '<div class="summary-item"><span class="summary-label">Security deposit</span><strong class="summary-value">' + money(l.deposit) + '</strong></div>'
                + '<div class="summary-item"><span class="summary-label">Lease period</span><strong class="summary-value">' + fmt(l.startDate) + ' <small>to</small> ' + fmt(l.endDate) + '</strong></div>'
                + '</div>'
                + '<div class="lease-card-pad">'
                + '<div class="lease-grid">'
                + infoCard('fa-building', 'Property & parties', [
                    detailRow('Property', property),
                    detailRow('Tenant', tenant),
                    detailRow('Owner', owner)
                ])
                + infoCard('fa-calendar-days', 'Agreement dates', [
                    detailRow('Start date', fmt(l.startDate)),
                    detailRow('End date', fmt(l.endDate)),
                    detailRow('Lease status', status[0])
                ])
                + infoCard('fa-pen-nib', 'Signature status', [
                    detailRow('Tenant signature', l.signatureTenant ? 'Signed' : 'Pending', l.signatureTenant ? 'signature-ok' : 'signature-pending'),
                    detailRow('Owner signature', l.signatureOwner ? 'Signed' : 'Pending', l.signatureOwner ? 'signature-ok' : 'signature-pending')
                ])
                + infoCard('fa-indian-rupee-sign', 'Financial terms', [
                    detailRow('Monthly rent', money(l.monthlyRent)),
                    detailRow('Security deposit', money(l.deposit))
                ])
                + '</div>'
                + '</div>'
+ '<article class="lease-card">'
                + '<div class="lease-card-pad">'
                + '<h3 style="margin:0 0 6px;font-size:20px;">Lease actions</h3>'
                + '<p style="margin:0 0 18px;color:var(--lease-muted);font-size:14px;">Continue managing this agreement or open related documents.</p>'
                + '<div class="lease-actions">'
                + '<a href="lease-signing?id=' + encodeURIComponent(l.id) + '" class="btn btn-lease-primary"><i class="fas fa-file-signature"></i> Sign a Lease</a>'
                + '<a href="documents" class="btn btn-lease-secondary"><i class="fas fa-folder-open"></i> View Documents</a>'
                + '<a href="lease-management" class="btn btn-lease-secondary"><i class="fas fa-arrow-left"></i> All Leases</a>'
                + '<a href="dashboard" class="btn btn-lease-secondary"><i class="fas fa-gauge-high"></i> Dashboard</a>'
                + '</div>'
                + '</div>'
                + '</article>'
                + '</div>';
        } catch (e) {
            wrap.innerHTML = '<div class="lease-error">'
                + '<i class="fas fa-triangle-exclamation"></i>'
                + '<h3>Unable to load lease</h3>'
                + '<p>' + esc(e.message || 'Could not load the selected lease.') + '</p>'
                + '<a href="lease-management" class="btn btn-primary">Back to leases</a>'
                + '</div>';
        }
    }

    loadLease();
})();
                + '</article>';