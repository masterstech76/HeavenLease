/* ============================================================
 * HeavenLease — Report Property / Report User shared module
 * Submits a safety report as a support ticket (auto-detects the
 * active form). Extracted from report-property.html + report-user.html.
 * Requires js/api.js + js/core.js loaded first.
 * ============================================================ */
(function () {
    'use strict';

    const form = document.getElementById('reportForm');
    if (!form) return;

    /* Detect mode from the page's own URL */
    const isUserReport = window.location.pathname.indexOf('report-user') !== -1;
    const idFieldId = isUserReport ? 'userId' : 'propId';
    const pageKey = isUserReport ? 'report_user' : 'report_property';
    const successMsg = isUserReport
        ? 'Report submitted. Our safety team will review it confidentially.'
        : 'Report submitted. Our safety team will review it.';

    form.addEventListener('submit', async function (ev) {
        ev.preventDefault();
        try {
            const idEl = document.getElementById(idFieldId);
            const reasonEl = document.getElementById('reason');
            const detailsEl = document.getElementById('details');
            const id = idEl ? idEl.value : '';
            const reason = reasonEl ? reasonEl.value : '';
            const details = detailsEl ? detailsEl.value : '';
            const label = isUserReport ? 'User ID' : 'Property ID';

            await api.createTicket(
                pageKey,
                'Report ' + (isUserReport ? 'user' : 'property') + ' #' + id + ' — ' + reason,
                label + ': ' + id + '\nReason: ' + reason + '\n\n' + details
            );

            showToast(successMsg, 'success');
            form.reset();
        } catch (e) {
            showToast(e.message || 'Report submission failed.', 'error');
        }
    });
})();