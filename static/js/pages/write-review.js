/* ============================================================
 * HeavenLease — Write Review page module
 * Star rating + comment submit → POST /api/feedback
 * (pageKey "reviews" or "reviews_prop_<propertyId>"),
 * Requires js/api.js + js/core.js loaded first.
 * ============================================================ */
(function () {
    'use strict';

    let rating = 0;
    const stars = document.querySelectorAll('#starWrap .star');

    function paint() {
        stars.forEach(function (s) {
            const selected = Number(s.dataset.v) <= rating;
            s.textContent = selected ? '★' : '☆';
            s.setAttribute('aria-checked', selected ? 'true' : 'false');
        });
    }

    stars.forEach(function (s) {
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

    const form = document.getElementById('reviewForm');

    if (form) {
        form.addEventListener('submit', async function (ev) {
            ev.preventDefault();

            if (!api.isAuthenticated()) {
                showToast('Please sign in to submit a review.', 'error');
                setTimeout(function () { window.location.replace('login?redirect=write-review'); }, 1100);
                return;
            }

            if (!rating) {
                showToast('Please select a star rating.', 'error');
                return;
            }

            try {
                const comment = document.getElementById('comment').value;
                const propId = document.getElementById('propId').value;
                const pageKey = 'reviews' + (propId ? ('_prop_' + propId) : '');

                await api.submitFeedback(pageKey, rating, comment);
                showToast('Review published! Thank you.', 'success');

                form.reset();
                rating = 0;
                paint();
            } catch (e) {
                showToast(e.message || 'Review submission failed.', 'error');
            }
        });
    }
})();