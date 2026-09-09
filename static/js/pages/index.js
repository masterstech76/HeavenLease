/* ============================================================
 * HeavenLease — Landing (index) page module
 * 1. Demo-data renderer: fills the featured-properties grid from
 *    window.HL_DEMO_DATA.properties when present; falls back to
 *    the real Properties API when the demo file is deleted.
 * 2. Landing UI: search filter, favorites, mobile menu.
 * Categories & steps sections are static HTML (not demo).
 * Requires js/api.js + js/core.js loaded first.
 * ============================================================ */
(function () {
    'use strict';

    const esc = function (s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
        });
    };
    const d = window.HL_DEMO_DATA;

    /* ---- Featured properties grid ---- */
    const grid = document.getElementById('propertyGrid');
    if (grid) {
        const renderProps = function (list) {
            grid.innerHTML = list.map(function (p) {
                var img = (p.photos && p.photos[0]) || 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1000&q=85';
                return '<article class="card property" data-location="' + esc((p.city || '').toLowerCase()) + '" data-type="' + esc((p.type || '').toLowerCase()) + '" data-price="' + (p.price || 0) + '">'
                    + '<div class="photo"><img src="' + esc(img) + '" alt="' + esc(p.title || 'Property') + '" loading="lazy">'
                    + '<span class="tag">' + esc(p.badge || 'FEATURED') + '</span>'
                    + '<button class="heart" onclick="favorite(this)"><i class="fa-regular fa-heart"></i></button></div>'
                    + '<div class="card-body">'
                    + '<div class="price">₹' + Number(p.price || 0).toLocaleString('en-IN') + ' <span>/ month</span></div>'
                    + '<div class="card-title">' + esc(p.title || '') + '</div>'
                    + '<div class="location"><i class="fa-solid fa-location-dot"></i> ' + esc(p.location || '') + '</div>'
                    + '<div class="meta"><span><i class="fa-solid fa-bed"></i> ' + (p.bhk || 0) + ' Beds</span><span><i class="fa-solid fa-shield-halved"></i> Verified</span></div>'
                    + '</div></article>';
            }).join('');
        };
        if (d && Array.isArray(d.properties) && d.properties.length) {
            renderProps(d.properties);
        } else if (window.api && typeof api.getProperties === 'function') {
            Promise.resolve(api.getProperties(0, 6)).then(function (list) {
                if (list && Array.isArray(list) && list.length) renderProps(list);
            }).catch(function () {});
        }
    }

    /* ---- Categories & steps are static HTML (not demo) ---- */
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

    const searchForm = document.getElementById("searchForm");
    if (searchForm) {
        searchForm.addEventListener("submit", function (e) {
            e.preventDefault();
            const location = (document.getElementById("location").value || "").trim().toLowerCase();
            const type = (document.getElementById("type").value || "").toLowerCase();
            const budget = document.getElementById("budget").value;
            const cards = Array.prototype.slice.call(document.querySelectorAll(".property"));
            let count = 0;
            cards.forEach(function (card) {
                const matchLocation = !location || (card.dataset.location || '').includes(location);
                const matchType = !type || card.dataset.type === type;
                const matchBudget = !budget || Number(card.dataset.price) <= Number(budget);
                const visible = matchLocation && matchType && matchBudget;
                card.style.display = visible ? "" : "none";
                if (visible) count++;
            });
            const props = document.getElementById("properties");
            if (props) props.scrollIntoView({ behavior: "smooth" });
            toast(count + (count === 1 ? " property found" : " properties found"));
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