/* ============================================================
 * HeavenLease — Properties Management (owner) page module
 * Lists the owner's properties (admin sees all), delete with
 * confirm. Extracted from properties-management.html.
 * Requires js/api.js + js/core.js loaded first.
 * ============================================================ */
(function () {
    'use strict';

    const user = api.getUser();

    function badge(status) {
        const map = {
            active: ['status-completed', 'Active'],
            pending: ['status-pending', 'Pending'],
            draft: ['status-pending', 'Draft'],
            archived: ['status-inactive', 'Archived'],
            inactive: ['status-inactive', 'Inactive']
        };
        const key = (status || '').toLowerCase();
        const item = map[key] || ['status-inactive', status || '—'];
        return '<span class="status ' + item[0] + '">' + api.escapeHtml(item[1]) + '</span>';
    }

    function money(value) {
        return '₹' + Math.round(Number(value) || 0).toLocaleString('en-IN');
    }

    function propertyMarkup(property) {
        const title = property.title || ('Property #' + property.id);
        const location = [property.locality, property.city].filter(Boolean).join(', ');
        const bhk = property.bhk ? api.escapeHtml(property.bhk) + ' BHK' : 'BHK not specified';
        const rent = money(property.rentAmount || property.price);

        return '<article class="property-row">'
            + '<div class="property-main">'
            + '<div class="property-title-line">'
            + '<div class="property-title">' + api.escapeHtml(title) + '</div>'
            + badge(property.status || 'active')
            + '</div>'
            + '<div class="property-meta">'
            + '<span><i class="fas fa-location-dot"></i>' + api.escapeHtml(location || 'Location not specified') + '</span>'
            + '<span><i class="fas fa-indian-rupee-sign"></i>' + rent + '/mo</span>'
            + '<span><i class="fas fa-bed"></i>' + bhk + '</span>'
            + '<span><i class="fas fa-eye"></i>' + Number(property.viewCount || 0) + ' views</span>'
            + '</div>'
            + '</div>'
            + '<div class="property-actions">'
            + '<a class="btn btn-sm btn-secondary" href="edit-property?id=' + encodeURIComponent(property.id) + '"><i class="fas fa-pen-to-square"></i> Edit</a>'
            + '<a class="btn btn-sm btn-secondary" href="property-detail?id=' + encodeURIComponent(property.id) + '"><i class="fas fa-eye"></i> View</a>'
            + '<button type="button" class="btn btn-sm btn-danger" onclick="deleteProp(' + Number(property.id) + ')"><i class="fas fa-trash"></i> Delete</button>'
            + '</div>'
            + '</article>';
    }

    async function loadProps() {
        const wrap = document.getElementById('propsWrap');
        if (!wrap) return;

        try {
            if (!user || !user.id) {
                wrap.innerHTML = '<div class="message-state">Please log in as an owner to manage properties.</div>';
                return;
            }

            const role = (user.role || '').toLowerCase();
            let list = [];
            if (role === 'admin') {
                list = (await api.getProperties(0, 200).catch(() => [])) || [];
            } else if (role === 'owner' || role === 'verified_owner') {
                list = (await api.getPropertiesByOwner(user.id).catch(() => [])) || [];
            }
            if (!Array.isArray(list)) list = [];

            if (list.length === 0) {
                wrap.innerHTML = '<div class="empty-state">'
                    + '<div class="empty-icon"><i class="fas fa-house-circle-check"></i></div>'
                    + '<h3>No properties listed yet</h3>'
                    + '<p>List your first property and manage it from here.</p>'
                    + '<a href="list-property" class="btn btn-primary" style="display:inline-flex;gap:8px;"><i class="fas fa-key"></i> List Your Property</a>'
                    + '</div>';
                return;
            }

            wrap.innerHTML = '<div class="properties-list">' + list.map(propertyMarkup).join('') + '</div>';
        } catch (error) {
            wrap.innerHTML = '<div class="message-state">' + api.escapeHtml(error.message || 'Could not load properties.') + '</div>';
        }
    }

    window.deleteProp = async function (id) {
        if (!confirm('Delete this property permanently?')) return;
        try {
            await api.deleteProperty(id);
            showToast('Property deleted.', 'success');
            await loadProps();
        } catch (error) {
            showToast(error.message || 'Delete failed.', 'error');
        }
    };

    loadProps();
})();