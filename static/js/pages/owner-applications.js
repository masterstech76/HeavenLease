/* ============================================================
 * HeavenLease — Owner Applications page module
 * Owner reviews tenant tour/application requests; accept/decline.
 * Extracted from owner-applications.html.
 * Requires js/api.js + js/core.js loaded first.
 * ============================================================ */
(function () {
    'use strict';

    const user = api.getUser();

    function badge(s) {
        const map = { 'pending': ['status-pending', 'Pending'], 'confirmed': ['status-active', 'Confirmed'],
                      'approved': ['status-active', 'Approved'], 'declined': ['status-inactive', 'Declined'],
                      'cancelled': ['status-inactive', 'Cancelled'], 'completed': ['status-completed', 'Completed'] };
        const m = map[(s || '').toLowerCase()] || ['status-inactive', s || '—'];
        return '<span class="status ' + m[0] + '">' + api.escapeHtml(m[1]) + '</span>';
    }
    function fmtDate(s) { if (!s) return '—'; const d = new Date(s); return isNaN(d.getTime()) ? String(s) : d; }

    async function loadApplications() {
        const wrap = document.getElementById('appWrap');
        try {
            if (!user || !user.id) { wrap.innerHTML = '<div style="text-align:center;padding:40px;color:var(--gray-500);">Please log in to view applications.</div>'; return; }
            let list = (await api.getBookingsByOwner(user.id).catch(() => [])) || [];
            if (!Array.isArray(list)) list = [];
            if (list.length === 0) {
                wrap.innerHTML = '<div style="text-align:center;padding:60px 20px;background:var(--white);border:2px dashed var(--gray-200);border-radius:var(--radius-xl);">'
                    + '<i class="fas fa-inbox" style="font-size:56px;color:var(--gray-300);"></i>'
                    + '<h3 style="margin:16px 0 6px;color:var(--dark);">No applications yet</h3>'
                    + '<p style="color:var(--gray-500);margin-bottom:20px;">When tenants request tours for your properties, they appear here for review.</p>'
                    + '<a href="properties-management" class="btn btn-primary" style="display:inline-flex;gap:8px;"><i class="fas fa-house-circle-check"></i> Manage Properties</a></div>';
                return;
            }
            wrap.innerHTML = list.map((b) => {
                const canAct = (b.status === 'pending');
                const actBtns = canAct
                    ? '<button class="btn btn-sm btn-primary" onclick="appAction(' + b.id + ',\'confirmed\')"><i class="fas fa-check"></i> Approve</button>'
                        + '<button class="btn btn-sm btn-secondary" onclick="appAction(' + b.id + ',\'declined\')"><i class="fas fa-xmark"></i> Decline</button>'
                    : '';
                return '<div style="background:var(--white);border:1px solid var(--gray-200);border-radius:var(--radius-lg);padding:18px 22px;margin-bottom:12px;display:flex;justify-content:space-between;gap:14px;flex-wrap:wrap;align-items:center;box-shadow:var(--shadow-sm);">'
                    + '<div><strong style="color:var(--dark);">' + api.escapeHtml(b.propertyTitle || ('Property #' + b.propertyId)) + '</strong> ' + badge(b.status)
                    + '<div style="font-size:12px;color:var(--gray-400);margin-top:6px;">Applicant: ' + api.escapeHtml(b.tenantName) + ' · ' + api.escapeHtml(b.tenantPhone || '') + '</div>'
                    + (b.message ? '<div style="font-size:13px;color:var(--gray-600);margin-top:6px;">"' + api.escapeHtml(b.message) + '"</div>' : '')
                    + '<div style="font-size:12px;color:var(--gray-400);margin-top:4px;">Tour: ' + api.escapeHtml(fmtDate(b.tourDate)) + ' · ' + api.escapeHtml(b.tourTime || '') + '</div></div>'
                    + '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">' + actBtns + '</div></div>';
            }).join('');
        } catch (e) {
            wrap.innerHTML = '<div style="text-align:center;padding:40px;color:var(--gray-500);">' + api.escapeHtml(e.message || 'Could not load applications.') + '</div>';
        }
    }

    window.appAction = async function (id, status) {
        try {
            await api.updateBookingStatus(id, status);
            showToast('Application updated.', 'success');
            loadApplications();
        } catch (e) { showToast(e.message || 'Action failed.', 'error'); }
    };

    /* ===== Style-enhancement MutationObserver (extracted from second inline) ===== */
    const wrap = document.getElementById('appWrap');
    if (wrap) {
        const observer = new MutationObserver(() => {
            wrap.querySelectorAll(':scope > div').forEach((el) => {
                if (!el.classList.contains('application-card') &&
                    el.querySelector('.status, button, [onclick*="appAction"]')) {
                    el.classList.add('application-card');
                    const children = Array.from(el.children);
                    if (children[0]) children[0].classList.add('app-main');
                    if (children[1]) children[1].classList.add('app-actions');
                    const first = el.querySelector('strong');
                    if (first && !first.classList.contains('property-title')) {
                        first.classList.add('property-title');
                        first.insertAdjacentHTML('afterbegin', '<i class="fas fa-house-chimney"></i>');
                    }
                }
            });
        });
        observer.observe(wrap, { childList: true, subtree: true });
    }

    loadApplications();
})();