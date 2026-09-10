/* ============================================================
 * HeavenLease — Transaction History page module
 * Payments list + escrow management + invoice modal (real backend).
 * Extracted from transaction-history.html.
 * Requires js/api.js + js/core.js loaded first.
 * ============================================================ */
(function () {
    'use strict';

    const user = api.getUser();
    if (user && user.role) {
        const link = document.getElementById('myProfileLink');
        if (link) link.href = 'edit-profile';
    }

    const txWrap = document.getElementById('txWrap');
    const escrowSection = document.getElementById('escrowSection');
    const escrowWrap = document.getElementById('escrowWrap');
    const invoiceModal = document.getElementById('invoiceModal');
    const invoiceCard = document.getElementById('invoiceCard');

    function money(n) {
        return '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN');
    }
    function fmtDate(s) {
        if (!s) return '';
        const d = new Date(s);
        return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    function escrowBadge(status) {
        const map = { 'ESCROW_PENDING': ['status-pending', 'Pending'], 'ESCROW_HELD': ['status-active', 'Held'], 'ESCROW_RELEASED': ['status-completed', 'Released'], 'ESCROW_DISPUTED': ['status-pending', 'Disputed'], 'ESCROW_RESOLVED': ['status-inactive', 'Resolved'] };
        const m = map[status] || ['status-inactive', status];
        return '<span class="status ' + m[0] + '">' + api.escapeHtml(m[1]) + '</span>';
    }

    async function loadPayments() {
        try {
            let list = await api.getMyPayments().catch(() => []);
            if (!Array.isArray(list)) list = [];
            list = list.filter((p) => (p.paymentType || '') !== 'ESCROW');
            if (list.length === 0) {
                txWrap.innerHTML = '<div style="text-align:center;padding:60px 20px;background:var(--white);border:2px dashed var(--gray-200);border-radius:var(--radius-xl);">'
                    + '<i class="fas fa-receipt" style="font-size:56px;color:var(--gray-300);"></i>'
                    + '<h3 style="margin:16px 0 6px;color:var(--dark);">No payments yet</h3>'
                    + '<p style="color:var(--gray-500);margin-bottom:20px;">Buy an Access Pass to unlock owner contact details.</p>'
                    + '<a href="payment" class="btn btn-primary" style="display:inline-flex;gap:8px;"><i class="fas fa-credit-card"></i> Get Access Pass</a>'
                    + '</div>';
                return;
            }
            txWrap.innerHTML = list.map((p) => {
                const invoiceBtn = '<button class="btn btn-sm btn-secondary" onclick="showInvoice(' + p.id + ')"><i class="fas fa-file-invoice"></i> Receipt</button>';
                return '<div style="background:var(--white);border:1px solid var(--gray-200);border-radius:var(--radius-lg);padding:18px 22px;margin-bottom:12px;display:flex;justify-content:space-between;gap:14px;flex-wrap:wrap;box-shadow:var(--shadow-sm);">'
                    + '<div>'
                    + '<strong style="color:var(--dark);">' + money(p.amount) + '</strong> <span class="status ' + ((p.status === 'completed' ? 'status-completed' : 'status-pending')) + '">' + api.escapeHtml((p.status || 'paid').toUpperCase()) + '</span>'
                    + '<div style="font-size:12px;color:var(--gray-400);margin-top:6px;">'
                    + api.escapeHtml(p.paymentType || 'ONLINE')
                    + (p.description ? ' · ' + api.escapeHtml(p.description) : '')
                    + ' · ' + api.escapeHtml(fmtDate(p.createdAt))
                    + (p.transactionId ? ' · <i class="fas fa-hashtag"></i> ' + api.escapeHtml(p.transactionId) : '')
                    + '</div>'
                    + '</div>'
                    + '<div style="display:flex;align-items:center;gap:8px;">' + invoiceBtn + '</div>'
                    + '</div>';
            }).join('');
        } catch (e) {
            txWrap.innerHTML = '<p style="text-align:center;color:var(--gray-400);padding:40px 0;">Could not load transactions.</p>';
        }
    }

    async function loadEscrows() {
        try {
            let list = await api.getMyEscrows().catch(() => []);
            if (!Array.isArray(list)) list = [];
            if (list.length === 0) return;
            escrowSection.style.display = 'block';
            escrowWrap.innerHTML = list.map((p) => {
                const isTenant = (user && user.id === p.userId);
                const isOwner = (user && user.id === p.ownerId);
                const actions = [];
                if ((p.status === 'ESCROW_PENDING' || p.status === 'ESCROW_HELD') && (isTenant || isOwner)) {
                    const party = (isTenant && !p.escrowTenantApproved) ? 'tenant' : ((isOwner && !p.escrowOwnerApproved) ? 'owner' : null);
                    if (party) actions.push('<button class="btn btn-sm btn-primary" onclick="escrowAction(' + p.id + ',\'release\',\'' + party + '\')"><i class="fas fa-check"></i> Approve Release</button>');
                }
                if ((p.status === 'ESCROW_PENDING' || p.status === 'ESCROW_HELD') && (isTenant || isOwner)) {
                    actions.push('<button class="btn btn-sm ghost" onclick="escrowAction(' + p.id + ',\'dispute\')"><i class="fas fa-flag"></i> Dispute</button>');
                }
                const note = (p.escrowDisputeReason ? ' · <i class="fas fa-quote-left"></i> ' + api.escapeHtml(p.escrowDisputeReason) : (p.escrowResolutionNote ? ' · ' + api.escapeHtml(p.escrowResolutionNote) : ''));
                return '<div style="background:var(--white);border:1px solid var(--gray-200);border-radius:var(--radius-lg);padding:18px 22px;margin-bottom:12px;box-shadow:var(--shadow-sm);">'
                    + '<div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;">'
                    + '<div>'
                    + '<strong style="color:var(--dark);">' + money(p.amount) + '</strong> ' + escrowBadge(p.status)
                    + '<div style="font-size:12px;color:var(--gray-400);margin-top:6px;">'
                    + 'Security deposit' + (p.description ? ' · ' + api.escapeHtml(p.description) : '')
                    + ' · ' + api.escapeHtml(fmtDate(p.createdAt)) + note
                    + (p.escrowTenantApproved ? ' · Tenant ✓' : '') + (p.escrowOwnerApproved ? ' · Owner ✓' : '')
                    + '</div>'
                    + '</div>'
                    + (actions.length ? '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">' + actions.join('') + '</div>' : '')
                    + '</div>'
                    + '</div>';
            }).join('');
        } catch (e) { /* no escrow panel */ }
    }
window.showInvoice = async function (id) {
        try {
            const inv = await api.getInvoice(id);
            invoiceCard.innerHTML =
                '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">'
                + '<div><div style="font-size:22px;font-weight:800;color:#1e1b4b;">Heaven<span style="color:#5b5ce2;">Lease</span></div>'
                + '<div style="font-size:12px;color:#687386;">Rental marketplace · India</div></div>'
                + '<div style="text-align:right;"><div style="font-weight:700;color:#182033;">Invoice</div>'
                + '<div style="font-size:12px;color:#687386;">' + api.escapeHtml(inv.invoiceNumber || '') + '</div></div>'
                + '</div>'
                + '<hr style="border:none;border-top:1px solid #e4e7ee;margin:0 0 18px;">'
                + '<div style="display:flex;justify-content:space-between;font-size:13px;color:#525c6e;margin-bottom:6px;"><span>Payer</span><strong style="color:#182033;">' + api.escapeHtml(inv.payer || '—') + '</strong></div>'
                + '<div style="display:flex;justify-content:space-between;font-size:13px;color:#525c6e;margin-bottom:6px;"><span>Issued</span><span>' + api.escapeHtml(fmtDate(inv.issuedAt)) + '</span></div>'
                + '<div style="display:flex;justify-content:space-between;font-size:13px;color:#525c6e;margin-bottom:6px;"><span>Reference</span><span>' + api.escapeHtml(inv.transactionId || '—') + '</span></div>'
                + '<hr style="border:none;border-top:1px solid #e4e7ee;margin:18px 0;">'
                + '<div style="display:flex;justify-content:space-between;font-size:13px;color:#525c6e;margin-bottom:6px;"><span>Description</span><span>' + api.escapeHtml(inv.description || inv.paymentType || '—') + '</span></div>'
                + '<div style="display:flex;justify-content:space-between;font-size:13px;color:#525c6e;margin-bottom:6px;"><span>Status</span><span>' + api.escapeHtml((inv.status || '').toUpperCase()) + '</span></div>'
                + '<hr style="border:none;border-top:1px solid #e4e7ee;margin:18px 0;">'
                + '<div style="display:flex;justify-content:space-between;align-items:center;font-size:20px;font-weight:800;color:#182033;"><span>Total</span><span>' + money(inv.amount) + '</span></div>'
                + '<div style="margin-top:24px;display:flex;gap:10px;">'
                + '<button class="btn btn-primary" style="flex:1;display:inline-flex;justify-content:center;" onclick="window.print()"><i class="fas fa-print"></i> Print / Save PDF</button>'
                + '<button class="btn btn-secondary" style="flex:1;display:inline-flex;justify-content:center;" onclick="closeInvoice()"><i class="fas fa-xmark"></i> Close</button>'
                + '</div>';
            invoiceModal.style.display = 'flex';
        } catch (e) {
            showToast(e.message || 'Could not load invoice.', 'error');
        }
    };
    window.closeInvoice = function () { invoiceModal.style.display = 'none'; };
    if (invoiceModal) invoiceModal.addEventListener('click', (e) => { if (e.target === invoiceModal) invoiceModal.style.display = 'none'; });

    window.escrowAction = async function (id, action, party) {
        try {
            if (action === 'dispute') {
                const reason = prompt('Reason for dispute:');
                if (reason === null) return;
                await api.disputeEscrow(id, reason);
            } else {
                await api.releaseEscrow(id, party);
            }
            showToast('Escrow updated.', 'success');
            loadEscrows();
        } catch (error) {
            showToast(error.message || 'Action failed.', 'error');
        }
    };

    loadPayments();
    loadEscrows();
})();