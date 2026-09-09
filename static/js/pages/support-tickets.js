/* ============================================================
 * HeavenLease — Support Tickets (list) module
 * Lists the user's support tickets with status badges.
 * Extracted from support-tickets.html.
 * Requires js/api.js + js/core.js loaded first.
 * ============================================================ */
(function () {
    'use strict';

    const wrap = document.getElementById('ticketWrap');
    if (!wrap) return;

    function badge(s) {
        const m = {
            'OPEN': ['status-pending', 'Open'],
            'IN_PROGRESS': ['status-active', 'In Progress'],
            'RESOLVED': ['status-completed', 'Resolved'],
            'CLOSED': ['status-inactive', 'Closed']
        };
        const x = m[(s || '').toUpperCase()] || ['status-pending', s || '—'];
        return '<span class="status ' + x[0] + '">' + api.escapeHtml(x[1]) + '</span>';
    }

    function fmt(s) {
        if (!s) return '—';
        const d = new Date(s);
        return isNaN(d.getTime()) ? String(s) : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    async function loadTickets() {
        try {
            let list = (await api.getMyTickets().catch(() => [])) || [];
            if (!Array.isArray(list)) list = [];

            if (list.length === 0) {
                wrap.innerHTML = '<div class="empty-state">'
                    + '<div class="empty-icon"><i class="fas fa-headset"></i></div>'
                    + '<h3>No tickets yet</h3>'
                    + '<p>Need help? Open a ticket and we will get back to you.</p>'
                    + '<a href="support-ticket-detail" class="btn btn-primary" style="display:inline-flex;gap:8px;"><i class="fas fa-plus"></i> Open a Ticket</a>'
                    + '</div>';
                return;
            }

            wrap.innerHTML = list.map(function (t) {
                return '<a href="support-ticket-detail?id=' + encodeURIComponent(t.id) + '" class="ticket-row">'
                    + '<div class="ticket-main">'
                    + '<div class="ticket-title">'
                    + '<strong>' + api.escapeHtml(t.subject || ('Ticket #' + t.id)) + '</strong>'
                    + badge(t.status)
                    + '</div>'
                    + '<div class="ticket-meta">'
                    + api.escapeHtml(t.pageKey || 'support')
                    + ' · ' + fmt(t.createdAt)
                    + '</div>'
                    + '</div>'
                    + '<span class="ticket-arrow" aria-hidden="true"><i class="fas fa-chevron-right"></i></span>'
                    + '</a>';
            }).join('');
        } catch (e) {
            wrap.innerHTML = '<div class="empty-state">'
                + '<div class="empty-icon"><i class="fas fa-triangle-exclamation"></i></div>'
                + '<h3>Unable to load tickets</h3>'
                + '<p>' + api.escapeHtml(e.message || 'Could not load tickets.') + '</p>'
                + '</div>';
        }
    }

    loadTickets();
})();