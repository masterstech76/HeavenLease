/* ============================================================
 * HeavenLease — Comfort Scores page module
 * Injects a "Live Tenant Comfort Ratings" panel into the
 * "How We Score" section and loads real feedback from
 * GET /api/feedback/page/comfort_feedback.
 * Requires js/api.js + js/core.js loaded first.
 * ============================================================ */
(function () {
    'use strict';

    const intro = document.querySelector('.scores-section .section-header');
    if (!intro) return;

    const box = document.createElement('div');
    box.id = 'liveComfortFeedback';
    box.style.cssText = 'margin-top:24px;padding:20px;border-radius:16px;background:var(--white,#fff);border:1px solid var(--gray-200,#e5e7eb);';
    box.innerHTML = '<h3 style="font-size:15px;font-weight:600;margin-bottom:4px;"><i class="fas fa-users" style="color:var(--primary,#2563eb);margin-right:8px;"></i>Live Tenant Comfort Ratings</h3>'
        + '<p id="fpLiveSub" style="font-size:13px;color:#687386;margin-bottom:12px;">Loading real feedback…</p>'
        + '<div id="fpLiveAvg" style="font-size:26px;font-weight:800;color:#182033;">—</div>'
        + '<div id="fpLiveRecent" style="margin-top:12px;font-size:13px;color:#374151;"></div>'
        + '<div id="fpLiveEmpty" style="font-size:13px;color:#687386;">No tenant feedback yet — submit yours from the Comfort Feedback page.</div>';
    intro.parentNode.insertBefore(box, intro.nextSibling);

    const avgEl = document.getElementById('fpLiveAvg');
    const recentEl = document.getElementById('fpLiveRecent');
    const subEl = document.getElementById('fpLiveSub');
    const emptyEl = document.getElementById('fpLiveEmpty');

    if (emptyEl) emptyEl.style.display = 'none';

    const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));

    if (!subEl || !avgEl || !recentEl || !emptyEl) return;

    api.getFeedback('comfort_feedback').then(function (res) {
        if (!res) { subEl.textContent = 'Ratings unavailable right now.'; return; }
        const d = res;
        const avg = d.average || 0;
        const count = d.count || 0;
        subEl.textContent = count + ' tenant rating' + (count === 1 ? '' : 's') + ' so far (1–5 stars).';
        avgEl.innerHTML = (avg ? avg.toFixed(1) : '—') + ' <small style="font-size:14px;color:#687386;">/ 5 average</small>'
            + '<div style="font-size:13px;color:#f59e0b;margin-top:4px;">' + ('★★★★★'.slice(0, Math.round(avg))) + ('☆☆☆☆☆'.slice(0, 5 - Math.round(avg))) + '</div>';
        const recent = d.recent || [];
        if (recent.length) {
            recentEl.innerHTML = recent.slice(0, 3).map(function (r) {
                return '<div style="border-top:1px solid #eef0f5;padding:8px 0;"><span style="color:#f59e0b;">' + '★'.repeat(Math.min(5, r.stars || 0)) + '</span> '
                    + '<span class="esc">' + esc(String((r.comment || '').slice(0, 140))) + '</span></div>';
            }).join('');
        } else {
            emptyEl.style.display = 'block';
        }
    }).catch(function () {
        subEl.textContent = 'Ratings unavailable right now.';
    });
})();