/* ============================================================
 * HeavenLease — Properties (browse) page module
 * Loads the real property list, filters/sorts/paginates, gates
 * below-fold results behind the Access Pass (server-side truth),
 * wires favorites + chat links. Navbar/hamburger/backToTop are
 * wired by js/core.js (script.js). Requires api.js loaded first.
 * ============================================================ */
(function () {
    'use strict';

    const propertiesListGrid = document.getElementById('propertiesListGrid');
    const propertyCount = document.getElementById('propertyCount');
    const navbar = document.getElementById('navbar');
    const backToTop = document.getElementById('backToTop');

    if (!propertiesListGrid) return;

    const PER_PAGE = 9;
    const FREE_PREVIEW_COUNT = 15;
    let allProperties = (typeof loadAllProperties === 'function') ? loadAllProperties() : [];
    let lastFiltered = allProperties;
    let currentPage = 1;
    let isPaidUserFlag = false;

    // ===== ACCESS PASS GATING =====
    (async () => {
        try {
            const sub = await loadSubscription();
            isPaidUserFlag = !!(sub && sub.active);
        } catch (e) {
            isPaidUserFlag = false;
        }
        renderAllProperties(lastFiltered || allProperties);
    })();

    // Load from the real backend; render once data is available.
    if (typeof fetchApiProperties === 'function') {
        fetchApiProperties(0, 100).then((list) => {
            if (list && list.length > 0) {
                allProperties = list;
            }
            renderAllProperties(allProperties);
            applyUrlQueryParams();
        }).catch(() => renderAllProperties([]));
    } else {
        renderAllProperties(allProperties);
    }

    function applyUrlQueryParams() {
        try {
            const params = new URLSearchParams(window.location.search);
            let changed = false;
            const loc = params.get('location');
            const budget = params.get('budget');
            const bhk = params.get('bhk');
            const type = params.get('type');
            if (loc) { const el = document.getElementById('filterLocation'); if (el) { el.value = loc; changed = true; } }
            if (budget) { const el = document.getElementById('filterBudget'); if (el) { const opt = Array.from(el.options).find((o) => o.value === budget); if (opt) { el.value = budget; changed = true; } } }
            if (bhk) { const el = document.getElementById('filterBhk'); if (el) { const opt = Array.from(el.options).find((o) => o.value === bhk); if (opt) { el.value = bhk; changed = true; } } }
            if (type) { const el = document.getElementById('filterType'); if (el) { const opt = Array.from(el.options).find((o) => o.value === type); if (opt) { el.value = type; changed = true; } } }
            if (changed) applyFilters();
        } catch (e) { /* ignore query params */ }
    }

    function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c])); }

    function renderAllProperties(filtered) {
        filtered = filtered || [];
        lastFiltered = filtered;
        if (propertyCount) propertyCount.textContent = '(' + filtered.length + ')';

        if (filtered.length === 0) {
            currentPage = 1;
            propertiesListGrid.innerHTML = '<div class="no-results" style="grid-column: 1/-1;">'
                + '<i class="fas fa-search"></i><h3>No Properties Found</h3>'
                + '<p>Try adjusting your filters, or check back soon — new verified listings are added every day.</p>'
                + '<div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">'
                + '<button class="btn btn-primary" onclick="clearAllFilters()"><i class="fas fa-rotate-left"></i> Clear Filters</button>'
                + '<a href="list-property" class="btn btn-outline"><i class="fas fa-plus"></i> List Your Property</a>'
                + '</div></div>';
            renderPagination(0);
            return;
        }

        const totalPages = Math.ceil(filtered.length / PER_PAGE);
        if (currentPage > totalPages) currentPage = totalPages;
        if (currentPage < 1) currentPage = 1;

        const start = (currentPage - 1) * PER_PAGE;
        const pageItems = filtered.slice(start, start + PER_PAGE);

        propertiesListGrid.innerHTML = pageItems.map((property, i) => {
            const globalIdx = filtered.indexOf(property);
            const isLocked = !isPaidUserFlag && globalIdx >= FREE_PREVIEW_COUNT;
            return (typeof renderPropertyCard === 'function')
                ? renderPropertyCard(property, { locked: isLocked })
                : '<div class="property-card fade-in-up" data-id="' + esc(property.id) + '">' + esc(property.title) + '</div>';
        }).join('');

        document.querySelectorAll('.property-favorite').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const icon = btn.querySelector('i');
                if (btn.classList.contains('active')) {
                    btn.classList.remove('active');
                    icon.classList.remove('fas');
                    icon.classList.add('far');
                } else {
                    btn.classList.add('active');
                    icon.classList.remove('far');
                    icon.classList.add('fas');
                }
            });
        });
        renderPagination(filtered.length);
    }

    function renderPagination(totalItems) {
        const pagination = document.getElementById('pagination');
        if (!pagination) return;
        const totalPages = Math.ceil(totalItems / PER_PAGE);
        if (totalPages <= 1) { pagination.innerHTML = ''; return; }
        let html = '';
        for (let i = 1; i <= totalPages; i++) {
            html += '<button class="page-btn ' + (i === currentPage ? 'active' : '') + '" onclick="goToPage(' + i + ')">' + i + '</button>';
        }
        pagination.innerHTML = html;
    }

    window.goToPage = function (page) {
        currentPage = page;
        renderAllProperties(lastFiltered);
    };

/* ===== Filters ===== */
    function applyFilters() {
        const location = (document.getElementById('filterLocation').value || '').toLowerCase();
        const budget = document.getElementById('filterBudget').value;
        const bhk = document.getElementById('filterBhk').value;
        const type = document.getElementById('filterType').value;
        const pet = document.getElementById('filterPet').checked;
        const furnished = document.getElementById('filterFurnished').checked;
        const quiet = document.getElementById('filterQuiet').checked;
        const sunny = document.getElementById('filterSunny').checked;
        const metro = document.getElementById('filterMetro').checked;

        const filtered = allProperties.filter((p) => {
            const pLoc = ((p.location || '') + ' ' + (p.title || '')).toLowerCase();
            if (location && !pLoc.includes(location)) return false;
            if (budget && Number(p.price) > parseInt(budget, 10)) return false;
            if (bhk && Number(p.bhk) !== parseInt(bhk, 10)) return false;
            if (type && p.propertyType !== type) return false;
            if (pet && !p.petFriendly) return false;
            if (furnished && !p.furnished) return false;
            if (quiet && Number(p.quietness) < 85) return false;
            if (sunny && Number(p.sunlight) < 85) return false;
            if (metro && Number(p.commute) < 90) return false;
            return true;
        });

        currentPage = 1;
        renderAllProperties(filtered);
    }

    function clearAllFilters() {
        document.getElementById('filterLocation').value = '';
        document.getElementById('filterBudget').value = '';
        document.getElementById('filterBhk').value = '';
        document.getElementById('filterType').value = '';
        document.getElementById('filterPet').checked = false;
        document.getElementById('filterFurnished').checked = false;
        document.getElementById('filterQuiet').checked = false;
        document.getElementById('filterSunny').checked = false;
        document.getElementById('filterMetro').checked = false;
        renderAllProperties(allProperties);
    }
    window.clearAllFilters = clearAllFilters;

    /* ===== Sort ===== */
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            const sortBy = e.target.value;
            let sorted = lastFiltered.slice();
            if (sortBy === 'price-low') sorted.sort((a, b) => Number(a.price) - Number(b.price));
            else if (sortBy === 'price-high') sorted.sort((a, b) => Number(b.price) - Number(a.price));
            else if (sortBy === 'quiet') sorted.sort((a, b) => Number(b.quietness) - Number(a.quietness));
            else if (sortBy === 'sunlight') sorted.sort((a, b) => Number(b.sunlight) - Number(a.sunlight));
            currentPage = 1;
            renderAllProperties(sorted);
        });
    }

    /* ===== Listeners ===== */
    const applyBtn = document.getElementById('applyFilters');
    if (applyBtn) applyBtn.addEventListener('click', applyFilters);
    const clearBtn = document.getElementById('clearFilters');
    if (clearBtn) clearBtn.addEventListener('click', clearAllFilters);

    window.openChat = function (encodedTitle) {
        window.location.href = 'messages?property=' + encodedTitle;
    };

    renderAllProperties(allProperties);
})();