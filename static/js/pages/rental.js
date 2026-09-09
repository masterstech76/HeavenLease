/* ============================================================
 * HeavenLease — Rental Application / History shared module
 * Property preview by ID + application form submit (createBooking).
 * Shared by rental-application.html and rental-history.html.
 * Requires js/api.js + js/core.js loaded first.
 * ============================================================ */
(function () {
    'use strict';

    const user = api.getUser();
    const form = document.getElementById('appForm');
    const propPreview = document.getElementById('propPreview');

    async function previewProp() {
        const el = document.getElementById('propId');
        if (!el) return;
        const id = Number(el.value || 0);
        if (!id) { if (propPreview) propPreview.style.display = 'none'; return; }
        try {
            const p = await api.getProperty(id);
            if (p && p.id) {
                if (propPreview) {
                    propPreview.style.display = 'block';
                    propPreview.innerHTML = '<strong>' + api.escapeHtml(p.title || ('Property #' + p.id)) + '</strong> · '
                        + (p.rentAmount ? ('₹' + Number(p.rentAmount).toLocaleString('en-IN') + '/mo') : '')
                        + ' · ' + api.escapeHtml((p.locality || '') + ' ' + (p.city || ''));
                }
            } else if (propPreview) {
                propPreview.style.display = 'block';
                propPreview.innerHTML = '<span style="color:#dc2626;">Property not found.</span>';
            }
        } catch (e) {
            if (propPreview) {
                propPreview.style.display = 'block';
                propPreview.innerHTML = '<span style="color:#dc2626;">' + api.escapeHtml(e.message || 'Could not load property.') + '</span>';
            }
        }
    }

    let debounceTimer;
    const propInput = document.getElementById('propId');
    if (propInput) {
        propInput.addEventListener('input', function () {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(previewProp, 400);
        });
    }

    if (form && user && user.id) {
        /* Prefill property id from ?property= */
        const q = new URLSearchParams(window.location.search);
        const pid = q.get('property') || q.get('id');
        if (pid && propInput) { propInput.value = pid; previewProp(); }

        form.addEventListener('submit', async function (ev) {
            ev.preventDefault();
            try {
                const p = await api.getProperty(Number(document.getElementById('propId').value));
                if (!p || !p.id) { showToast('Property not found. Please check the Property ID.', 'error'); return; }
                const payload = {
                    propertyId: p.id,
                    tenantId: user.id,
                    ownerId: p.ownerId,
                    tourDate: document.getElementById('tourDate').value,
                    tourTime: document.getElementById('tourTime').value,
                    message: document.getElementById('appMsg').value,
                    tenantName: user.fullName || user.name || '',
                    tenantPhone: user.phone || '',
                    propertyTitle: p.title
                };
                await api.createBooking(payload);
                showToast('Application submitted! The owner will review it.', 'success');
                setTimeout(function () { window.location.href = 'application-status'; }, 1200);
            } catch (e) { showToast(e.message || 'Submission failed.', 'error'); }
        });
    } else if (form) {
        form.innerHTML = '<div style="text-align:center;padding:40px;color:var(--gray-500);">Please <a href="login">log in</a> to apply for a property.</div>';
    }
})();