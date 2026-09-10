/* ============================================================
 * HeavenLease — Tenant Ratings page module
 * 1. Navbar scroll/hamburger/back-to-top wiring
 * 2. Live ratings + reviews (real Feedback API, pageKey "reviews"):
 *    average summary, recent list, inline star submit form.
 * Requires js/api.js + js/core.js loaded first.
 * ============================================================ */
(function () {
    'use strict';

    /* ===== Navbar / scroll / back-to-top ===== */
    const navbar = document.getElementById('navbar');
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.getElementById('navLinks');
    const backToTop = document.getElementById('backToTop');

    window.addEventListener('scroll', () => {
        if (window.scrollY > 50 && navbar) navbar.classList.add('scrolled');
        else if (navbar) navbar.classList.remove('scrolled');

        if (window.scrollY > 500 && backToTop) backToTop.classList.add('visible');
        else if (backToTop) backToTop.classList.remove('visible');
    });

    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navLinks.classList.toggle('active');
        });
        document.querySelectorAll('.nav-link').forEach((link) => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                navLinks.classList.remove('active');
            });
        });
    }

    if (backToTop) {
        backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    }

    /* ===== LIVE RATINGS & REVIEWS (real Feedback API) ===== */
    const PAGE_KEY = 'reviews';
    const esc = function (v) {
        return typeof api.escapeHtml === 'function'
            ? api.escapeHtml(String(v == null ? '' : v))
            : String(v == null ? '' : v);
    };
    const starsEl = document.getElementById('trAvgStars');
    const numEl = document.getElementById('trAvgNum');
    const countEl = document.getElementById('trCount');
    const listEl = document.getElementById('trList');

    function starRow(n) {
        const full = Math.max(0, Math.min(5, Math.round(n || 0)));
        return '★'.repeat(full) + '☆'.repeat(5 - full);
    }

    function fmtDate(s) {
        if (!s) return '';
        const d = new Date(s);
        if (isNaN(d.getTime())) return String(s);
        return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    }

    async function loadRatings() {
        if (!listEl) return;
        try {
            const d = await api.getFeedback(PAGE_KEY);
            const avg = d && d.average ? Number(d.average) : 0;
            const count = d && d.count ? Number(d.count) : 0;
            if (starsEl) { starsEl.textContent = starRow(avg); starsEl.setAttribute('aria-label', avg + ' out of 5 stars'); }
            if (numEl) numEl.textContent = avg ? avg.toFixed(1) : '—';
            if (countEl) countEl.textContent = count + ' rating' + (count === 1 ? '' : 's');
            const recent = (d && d.recent) || [];
            if (!recent.length) {
                listEl.innerHTML = '<div class="ratings-empty"><i class="fas fa-star" aria-hidden="true"></i> No ratings yet — be the first to rate your experience.</div>';
                return;
            }
            listEl.innerHTML = recent.slice(0, 10).map(function (r) {
                const userName = esc(r.userName || 'HeavenLease User');
                const initial = (r.userName || 'U').trim().slice(0, 1).toUpperCase() || 'U';
                const date = esc(fmtDate(r.createdAt));
                const comment = r.comment ? '<div class="ri-comment">' + esc(String(r.comment).slice(0, 300)) + '</div>' : '';
                return '<div class="ratings-item">'
                    + '<div class="ri-avatar">' + esc(initial) + '</div>'
                    + '<div class="ri-body">'
                    + '<div class="ri-name">' + userName + ' <span class="ri-stars">' + starRow(r.stars) + '</span><span class="ri-date">' + date + '</span></div>'
                    + comment
                    + '</div></div>';
            }).join('');
        } catch (e) {
            listEl.innerHTML = '<div class="ratings-empty">Ratings are unavailable right now. Please try again shortly.</div>';
        }
    }
    loadRatings();

    /* ===== Inline quick-rating widget ===== */
    let rating = 0;
    const row = document.getElementById('trStarRow');
    const commentEl = document.getElementById('trComment');
    const form = document.getElementById('trForm');

    function paint() {
        if (!row) return;
        row.querySelectorAll('.ratings-star').forEach(function (s) {
            const selected = Number(s.dataset.v) <= rating;
            s.textContent = selected ? '★' : '☆';
            s.setAttribute('aria-checked', selected ? 'true' : 'false');
        });
    }

    if (row) {
        row.querySelectorAll('.ratings-star').forEach(function (s) {
            s.addEventListener('click', function () {
                rating = Number(s.dataset.v);
                paint();
            });
            s.addEventListener('keydown', function (ev) {
                if (ev.key === 'Enter' || ev.key === ' ') {
                    ev.preventDefault();
                    rating = Number(s.dataset.v);
                    paint();
                }
            });
        });
    }

    if (form) {
        form.addEventListener('submit', async function (ev) {
            ev.preventDefault();
            if (!api.isAuthenticated()) {
                showToast('Please sign in to submit a rating.', 'error');
                setTimeout(function () { window.location.replace('login?redirect=tenant-ratings'); }, 1100);
                return;
            }
            if (!rating) {
                showToast('Please select a star rating.', 'error');
                return;
            }
            const submitBtn = form.querySelector('.ratings-submit');
            try {
                if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Publishing…'; }
                await api.submitFeedback(PAGE_KEY, rating, commentEl ? commentEl.value : '');
                showToast('Rating published! Thank you.', 'success');
                form.reset();
                rating = 0;
                paint();
                loadRatings();
            } catch (e) {
                showToast(e.message || 'Rating submission failed.', 'error');
            } finally {
                if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Publish Rating'; }
            }
        });
    }
})();