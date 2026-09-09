/* ============================================================
 * HeavenLease — Support Ticket Detail module
 * Create a ticket (form) or view an existing one (?id=).
 * Extracted from support-ticket-detail.html.
 * Requires js/api.js + js/core.js loaded first.
 * ============================================================ */
(function () {
    'use strict';

    const form = document.getElementById('ticketForm');
    const view = document.getElementById('ticketView');

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
        return isNaN(d.getTime()) ? String(s) : d.toLocaleString('en-IN');
    }

    if (form) {
        form.addEventListener('submit', async function (ev) {
            ev.preventDefault();
            try {
                const subject = document.getElementById('tSubject').value;
                const message = document.getElementById('tMessage').value;
                await api.createTicket('support', subject, message);
                showToast('Ticket submitted! Our team will respond shortly.', 'success');
                form.reset();
                loadView();
            } catch (e) {
                showToast(e.message || 'Ticket submission failed.', 'error');
            }
        });
    }

    async function loadView() {
        if (!view) return;
        const q = new URLSearchParams(window.location.search);
        const id = q.get('id');

        if (!id) {
            view.innerHTML = '';
            return;
        }

        try {
            let list = (await api.getMyTickets().catch(() => [])) || [];
            if (!Array.isArray(list)) list = [];

            const t = list.find(function (x) {
                return String(x.id) === String(id);
            });

            if (!t) {
                view.innerHTML = '<div class="empty-ticket">Ticket not found.</div>';
                return;
            }

            view.innerHTML =
                '<article class="ticket-card">'
                + '<div class="ticket-card-head">'
                + '<h3>' + api.escapeHtml(t.subject || ('Ticket #' + t.id)) + '</h3>'
                + badge(t.status)
                + '</div>'
                + '<div class="ticket-meta">Ticket #' + t.id
                + ' · ' + api.escapeHtml(t.pageKey || 'support')
                + ' · ' + fmt(t.createdAt)
                + '</div>'
                + '<p class="ticket-message">' + api.escapeHtml(t.message || '') + '</p>'
                + '</article>';
        } catch (e) {
            view.innerHTML = '<div class="empty-ticket">' + api.escapeHtml(e.message || 'Could not load ticket.') + '</div>';
        }
    }

    loadView();
})();