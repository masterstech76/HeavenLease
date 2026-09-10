/* ============================================================
 * HeavenLease — Landing (index) page module
 * Amazon-style browse feed backed by real data:
 *   1. Demo-data fallback (window.HL_DEMO_DATA.properties) when
 *      the live API has no listings (e.g. fresh/demo server).
 *   2. Real Properties API otherwise (fetchApiProperties + shared
 *      renderPropertyCard from core.js).
 *   3. Search → navigates to /properties?... (real filter flow).
 * Requires js/api.js + js/core.js loaded first.
 * ============================================================ */
(function () {
    'use strict';

    const esc = function (s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
        });
    };

    const KNOWN_CITIES = ['Mumbai', 'Pune', 'Bengaluru', 'Nashik', 'Delhi', 'Hyderabad', 'Chennai', 'Kolkata', 'Jaipur', 'Ahmedabad'];

    function renderCard(property) {
        if (typeof renderPropertyCard === 'function') return renderPropertyCard(property, { showActions: false });
        // Minimal fallback when core.js is absent.
        const p = property;
        const img = (p.photos && p.photos[0]) || 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1000&q=85';
        return '<article class="property-card fade-in-up" data-id="' + esc(p.id) + '">'
            + '<div class="property-image"><div class="property-image-placeholder"><img src="' + esc(img) + '" alt="' + esc(p.title || 'Property') + '" loading="lazy" style="width:100%;height:100%;object-fit:cover;"></div>'
            + '<span class="property-badge"><i class="fas fa-check-circle"></i> ' + esc(p.badge || 'Verified Owner') + '</span></div>'
            + '<div class="property-body"><h3 class="property-title">' + esc(p.title) + '</h3>'
            + '<p class="property-location"><i class="fas fa-location-dot"></i> ' + esc(p.location) + '</p>'
            + '<div class="property-price"><span class="price">₹' + Number(p.price || 0).toLocaleString('en-IN') + '</span><span class="per-month">/month</span></div>'
            + '</div></article>';
    }

    function renderRail(el, list) {
        if (!el) return;
        if (!list || !list.length) {
            el.innerHTML = '';
            el.parentElement.classList.add('empty');
            return;
        }
        el.innerHTML = list.map(renderCard).join('');
        wireFavoriteButtons(el);
        el.parentElement.classList.remove('empty');
    }

    function renderFeed(list) {
        const feed = document.getElementById('propertyFeed');
        if (!feed) return;
        if (!list || !list.length) {
            feed.innerHTML = '<div class="no-results" style="grid-column:1/-1;"><i class="fas fa-search"></i><h3>No homes listed yet</h3><p>Check back soon — new verified listings are added every day.</p><a href="list-property" class="btn btn-primary"><i class="fas fa-plus"></i> List your property</a></div>';
            return;
        }
        feed.innerHTML = list.map(renderCard).join('');
        wireFavoriteButtons(feed);
    }

    // Cards are rendered after core.js has already attached its one-time
    // .property-favorite listeners, so re-wire every fresh set of hearts.
    function wireFavoriteButtons(container) {
        if (!container) return;
        container.querySelectorAll('.property-favorite').forEach(function (btn) {
            if (btn.dataset.wired) return;
            btn.dataset.wired = '1';
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                if (typeof toggleFavorite === 'function') {
                    toggleFavorite(e);
                } else {
                    window.location.href = 'login?redirect=properties';
                }
            });
        });
    }

    function renderCityRail(list) {
        const rail = document.getElementById('cityRail');
        if (!rail) return;
        const cities = [];
        (list || []).forEach(function (p) {
            const c = (p.city || '').trim();
            if (c && cities.indexOf(c) < 0) cities.push(c);
        });
        const merged = cities.length ? cities : KNOWN_CITIES;
        rail.innerHTML = merged.slice(0, 8).map(function (c) {
            return '<a class="category-pill" href="properties?location=' + encodeURIComponent(c) + '">' + esc(c) + '</a>';
        }).join('') + '<a class="category-pill pill-more" href="properties">All cities <i class="fa-solid fa-arrow-right"></i></a>';
    }

    let shownFeed = false;
    function renderAll(list) {
        list = list || [];
        renderRail(document.getElementById('railRecommended'), list.slice(0, 6));
        renderRail(document.getElementById('railFresh'), list.slice(0, 8));
        renderCityRail(list);
        if (!shownFeed) { renderFeed(list); shownFeed = true; }
    }

    // 1) Demo data is the low-cost instant render (keeps the page useful when
    //    the API has no listings yet).
    if (window.HL_DEMO_DATA && Array.isArray(window.HL_DEMO_DATA.properties)) {
        renderAll(window.HL_DEMO_DATA.properties);
    } else if (typeof fetchApiProperties === 'function') {
        fetchApiProperties(0, 100).then(function (list) {
            if (list && list.length) {
                renderAll(list);
            } else {
                renderAll([]);
            }
        }).catch(function () { renderAll([]); });
    } else {
        renderAll([]);
    }
})();
/* ===== Landing UI ===== */
(function () {
    'use strict';

    function toast(message) {
        const el = document.getElementById("toast");
        if (!el) return;
        el.textContent = message;
        el.classList.add("show");
        clearTimeout(window.toastTimer);
        window.toastTimer = setTimeout(() => el.classList.remove("show"), 2500);
    }
    window.toast = toast;

    function favorite(button) {
        button.classList.toggle("active");
        const icon = button.querySelector("i");
        const active = button.classList.contains("active");
        icon.className = active ? "fa-solid fa-heart" : "fa-regular fa-heart";
        toast(active ? "Added to favourites" : "Removed from favourites");
    }
    window.favorite = favorite;

    // Home search navigates to the browse page with query params, exactly like
    // an Amazon-style search. properties.js reads ?location/?type/?budget via
    // applyUrlQueryParams(), so no backend change is needed. Param VALUES match
    // properties.html's filter options (type is lowercase; budget is a bucket).
    const searchForm = document.getElementById("searchForm");
    if (searchForm) {
        searchForm.addEventListener("submit", function (e) {
            e.preventDefault();
            const location = (document.getElementById("location").value || "").trim();
            const type = (document.getElementById("type").value || "").trim().toLowerCase();
            const budget = (document.getElementById("budget").value || "").trim();
            const qs = new URLSearchParams();
            if (location) qs.set("location", location);
            if (type) qs.set("type", type);
            if (budget) qs.set("budget", budget);
            const query = qs.toString();
            window.location.href = "properties" + (query ? "?" + query : "");
        });
    }

    function toggleMenu() {
        const links = document.querySelector(".links");
        if (!links) return;
        if (getComputedStyle(links).display === "none") {
            links.style.display = "flex";
            links.style.position = "absolute";
            links.style.top = "78px";
            links.style.left = "0";
            links.style.right = "0";
            links.style.padding = "20px";
            links.style.background = "#12182a";
            links.style.flexDirection = "column";
            links.style.gap = "18px";
        } else {
            links.removeAttribute("style");
        }
    }
    window.toggleMenu = toggleMenu;
})();