/* ============================================================
 * HeavenLease — Maintenance Request (tenant form) module
 * Creates a maintenance request against the tenant's booked
 * property. Extracted from maintenance-request.html.
 * Requires js/api.js + js/core.js loaded first.
 * ============================================================ */
(function () {
    'use strict';

    const user = api.getUser();
    if (user && user.role) {
        const link = document.getElementById('myProfileLink');
        if (link) link.href = 'edit-profile';
    }

    /* ===== Navbar scroll + back-to-top ===== */
    const navbar = document.getElementById('navbar');
    const backToTop = document.getElementById('backToTop');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50 && navbar) navbar.classList.add('scrolled');
        else if (navbar) navbar.classList.remove('scrolled');
        if (window.scrollY > 500 && backToTop) backToTop.classList.add('visible');
        else if (backToTop) backToTop.classList.remove('visible');
    });
    if (backToTop) backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

    /* ===== Property dropdown (tenant's booked properties) ===== */
    const propSelect = document.getElementById('propertySelect');
    async function loadProperties() {
        try {
            const me = api.getUser() || {};
            let bookings = [];
            if (me.id) {
                bookings = (await api.getBookingsByTenant(me.id).catch(() => [])) || [];
            }
            const props = (Array.isArray(bookings) ? bookings : [])
                .filter((b) => b && b.propertyId)
                .map((b) => ({ id: b.propertyId, label: (b.propertyTitle || ('Property #' + b.propertyId)) + (b.status ? ' (' + b.status + ')' : '') }))
                .filter((v, i, a) => a.findIndex((x) => x.id === v.id) === i);
            if (props.length === 0) {
                propSelect.innerHTML = '<option value="">No booked properties found — book a tour first</option>';
                propSelect.disabled = true;
                return;
            }
            propSelect.innerHTML = props.map((p) => '<option value="' + p.id + '">' + api.escapeHtml(p.label) + '</option>').join('');
        } catch (e) {
            propSelect.innerHTML = '<option value="">Could not load your properties</option>';
        }
    }
    if (propSelect) loadProperties();

    /* ===== Submit ===== */
    window.submitMaintenance = async function (ev) {
        ev.preventDefault();
        const subject = document.getElementById('subject').value.trim();
        const description = document.getElementById('description').value.trim();
        const propertyId = document.getElementById('propertySelect').value;
        const statusEl = document.getElementById('formStatus');
        if (!subject || !description || !propertyId) {
            if (statusEl) statusEl.textContent = 'Please fill in the property, subject and details.';
            return;
        }
        const btn = ev.target.querySelector('button[type="submit"]');
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting…'; }
        try {
            await api.createMaintenanceRequest({
                propertyId: Number(propertyId),
                category: document.getElementById('category').value,
                priority: document.getElementById('priority').value,
                subject,
                description,
                tenantName: (api.getUser() || {}).name || ''
            });
            if (statusEl) { statusEl.innerHTML = '<i class="fas fa-check-circle" style="color:var(--hl-green);"></i> Request submitted — your owner has been notified.'; }
            showToast('Maintenance request submitted!', 'success');
            setTimeout(() => { window.location.href = 'maintenance-requests'; }, 1200);
        } catch (error) {
            if (statusEl) statusEl.textContent = error.message || 'Failed to submit.';
            showToast(error.message || 'Failed to submit request.', 'error');
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Request'; }
        }
    };
    const form = document.getElementById('maintenanceForm');
    if (form) form.addEventListener('submit', window.submitMaintenance);
})();