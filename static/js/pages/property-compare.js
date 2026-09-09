/* ============================================================
 * HeavenLease — Property Compare page module
 * Compare up to 4 properties side-by-side (table of features).
 * Extracted from property-compare.html.
 * Requires js/api.js + js/core.js loaded first.
 * ============================================================ */
(function () {
    'use strict';

    const wrap = document.getElementById('cmpWrap');
    if (!wrap) return;
    let ids = [];

    function money(n) { return '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN'); }
    function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c])); }

    function rows(p) {
        return [
            ['Rent', '<strong>' + money(p.rentAmount || p.price) + '/mo</strong>'],
            ['Deposit', money(p.deposit)],
            ['BHK / Type', esc((p.bhk || '') + ' ' + (p.propertyType || ''))],
            ['Location', esc([p.locality, p.city].filter(Boolean).join(', ') || '—')],
            ['Quietness', (p.quietness != null ? p.quietness + '%' : '—')],
            ['Sunlight', (p.sunlight != null ? p.sunlight + '%' : '—')],
            ['Commute', (p.commute != null ? p.commute + '%' : '—')],
            ['Furnished', (p.furnished ? 'Yes' : 'No')],
            ['Pet friendly', (p.petFriendly ? 'Yes' : 'No')]
        ].map(function (r) { return '<tr><td style="padding:8px 10px;color:var(--gray-500);font-size:12px;">' + r[0] + '</td><td style="padding:8px 10px;font-size:13px;color:var(--dark);">' + r[1] + '</td></tr>'; }).join('');
    }

    async function render() {
        const loaded = [];
        for (const id of ids) {
            try { const p = await api.getProperty(id); if (p && p.id) loaded.push(p); } catch (e) { /* skip missing */ }
        }
        if (loaded.length === 0) {
            wrap.innerHTML = '<div style="text-align:center;padding:60px 20px;background:var(--white);border:2px dashed var(--gray-200);border-radius:var(--radius-xl);">'
                + '<i class="fas fa-scale-balanced" style="font-size:56px;color:var(--gray-300);"></i>'
                + '<h3 style="margin:16px 0 6px;color:var(--dark);">Nothing to compare yet</h3>'
                + '<p style="color:var(--gray-500);margin-bottom:20px;">Enter a property ID above or browse properties to find one.</p>'
                + '<a href="properties" class="btn btn-primary" style="display:inline-flex;gap:8px;"><i class="fas fa-building"></i> Browse Properties</a></div>';
            return;
        }
        wrap.innerHTML = '<div style="overflow-x:auto;background:var(--white);border:1px solid var(--gray-200);border-radius:var(--radius-xl);box-shadow:var(--shadow-sm);padding:20px;">'
            + '<table style="width:100%;border-collapse:collapse;min-width:640px;"><thead><tr>'
            + '<th style="text-align:left;padding:12px 10px;font-size:13px;color:var(--gray-500);">Feature</th>'
            + loaded.map(function (p) {
                return '<th style="padding:12px 10px;text-align:left;"><div style="font-size:14px;color:var(--dark);">' + api.escapeHtml(p.title || ('#' + p.id)) + '</div>'
                    + '<a class="btn btn-sm btn-secondary" style="margin-top:8px;" href="property-detail?id=' + encodeURIComponent(p.id) + '"><i class="fas fa-eye"></i> View</a></th>';
            }).join('')
            + '</tr></thead><tbody>'
            + loaded.map(function (p) { return '<tr>' + rows(p) + '</tr>'; }).join('')
            + '</tbody></table></div>';
    }

    window.addToCompare = async function () {
        const el = document.getElementById('pidInput');
        const id = Number((el && el.value) || 0);
        if (!id || ids.includes(id)) return;
        if (ids.length >= 4) { showToast('You can compare up to 4 properties.', 'error'); return; }
        try {
            const p = await api.getProperty(id);
            if (!p || !p.id) { showToast('Property not found.', 'error'); return; }
            ids.push(id);
            if (el) el.value = '';
            render();
        } catch (e) { showToast(e.message || 'Could not load property.', 'error'); }
    };

    window.clearCompare = function () { ids = []; render(); };

    /* Auto-add from ?ids=1,2,3 */
    const q = new URLSearchParams(window.location.search);
    const v = q.get('ids');
    if (v) {
        v.split(',').forEach(function (x) {
            const n = Number(x);
            if (n && !ids.includes(n) && ids.length < 4) ids.push(n);
        });
    }
    render();
})();