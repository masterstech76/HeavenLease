/* ============================================================
 * HeavenLease — Payment Methods page module
 * Shows subscription status + payment list.
 * Extracted from payment-methods.html.
 * Requires js/api.js + js/core.js loaded first.
 * ============================================================ */
(function () {
    'use strict';

    const subWrap = document.getElementById('subWrap');
    const payWrap = document.getElementById('payWrap');
    if (!subWrap || !payWrap) return;

    function money(n) { return '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN'); }
    function fmt(s) { if (!s) return '—'; const d = new Date(s); return isNaN(d.getTime()) ? String(s) : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
    function esc(s) { return api.escapeHtml(String(s == null ? '' : s)); }

    async function loadSub() {
        try {
            const sub = await api.getSubscription();
            const active = !!(sub && sub.active);
            subWrap.innerHTML =
                '<div class="subscription-card">'
                + '<div class="subscription-main">'
                + '<div class="subscription-icon"><i class="fas fa-credit-card"></i></div>'
                + '<div><div class="sub-title">Access Pass <span class="status ' + (active ? 'status-completed' : 'status-inactive') + '">' + (active ? 'ACTIVE' : 'INACTIVE') + '</span></div>'
                + '<div class="sub-meta">' + (active ? ('Valid until ' + fmt(sub.expiresAt) + ((sub.amount) ? (' · Paid ' + money(sub.amount)) : '')) : 'No active subscription. Upgrade to contact owners and unlock property details.') + '</div></div>'
                + '</div>'
                + '<a href="payment" class="btn btn-primary"><i class="fas fa-credit-card"></i> ' + (active ? 'Manage' : 'Get Access Pass') + '</a>'
                + '</div>';
        } catch (e) {
            subWrap.innerHTML = '<div class="error">' + esc(e.message || 'Could not load subscription.') + '</div>';
        }
    }

    async function loadPayments() {
        try {
            let list = (await api.getMyPayments().catch(() => [])) || [];
            if (!Array.isArray(list)) list = [];
            if (list.length === 0) { payWrap.innerHTML = '<div class="empty">No payments yet.</div>'; return; }
            payWrap.innerHTML = '<div class="payments-list">' + list.map(function (p) {
                return '<div class="payment-row">'
                    + '<div class="payment-left"><div class="payment-icon"><i class="fas fa-receipt"></i></div><div>'
                    + '<div><span class="payment-amount">' + money(p.amount) + '</span> <span class="status ' + ((p.status === 'completed') ? 'status-completed' : 'status-pending') + '">' + esc((p.status || 'paid').toUpperCase()) + '</span></div>'
                    + '<div class="payment-meta">' + esc(p.paymentType || 'ONLINE') + ' · ' + fmt(p.createdAt) + '</div>'
                    + '</div></div>'
                    + '<a class="btn btn-secondary" href="transaction-history"><i class="fas fa-receipt"></i> Receipts</a>'
                    + '</div>';
            }).join('') + '</div>';
        } catch (e) {
            payWrap.innerHTML = '<div class="error">' + esc(e.message || 'Could not load payments.') + '</div>';
        }
    }

    loadSub();
    loadPayments();
})();