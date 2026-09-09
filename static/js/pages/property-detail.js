/* ============================================================
 * HeavenLease — Property Detail page module
 * Loads the property from the backend (?id=), renders full detail
 * (gallery, amenities, comfort scores, owner card with subscription
 * gate), wires the favorite toggle + real booking form submit.
 * Requires js/api.js + js/core.js (script.js) loaded first.
 * ============================================================ */
(function () {
    'use strict';

    const detailMain = document.getElementById('detailMain');
    const bookingForm = document.getElementById('bookingForm');
    if (!detailMain) return;

    function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c])); }

    const urlParams = new URLSearchParams(window.location.search);
    const propertyId = parseInt(urlParams.get('id')) || 1;
    let allProperties = (typeof loadAllProperties === 'function') ? loadAllProperties() : [];
    let property = allProperties.find((p) => Number(p.id) === propertyId) || allProperties[0] || {};

    function renderDetail(property) {
        const p = property || {};
        const breadcrumb = document.getElementById('breadcrumbTitle');
        if (breadcrumb) breadcrumb.textContent = p.title || 'Property';

        const chatOwnerBtn = document.getElementById('chatOwnerBtn');
        if (chatOwnerBtn) chatOwnerBtn.href = 'messages?property=' + encodeURIComponent(p.title || '');

        function comfortCard(icon, score, label) {
            const s = Math.max(0, Math.min(100, Number(score) || 0));
            return '<div class="comfort-detail-card"><i class="fas ' + icon + '"></i>'
                + '<span class="score">' + s + '%</span><span class="label">' + label + '</span>'
                + '<div class="comfort-detail-bar"><div class="comfort-detail-fill" style="width: ' + s + '%"></div></div></div>';
        }

        detailMain.innerHTML =
            '<div class="detail-gallery">'
            + '<div class="detail-gallery-placeholder"><i class="fas ' + esc(p.icon) + '"></i></div>'
            + '<span class="detail-badge"><i class="fas fa-check-circle"></i> ' + esc(p.badge) + '</span>'
            + '<button class="detail-favorite" id="detailFavorite"><i class="far fa-heart"></i></button>'
            + '</div>'
            + '<div class="detail-content">'
            + '<div class="detail-title-row"><h1 class="detail-title">' + esc(p.title) + '</h1></div>'
            + '<p class="detail-location"><i class="fas fa-location-dot"></i> ' + esc(p.location) + '</p>'
            + '<div class="detail-price-row">'
            + '<span class="detail-price">' + (typeof formatPrice === 'function' ? formatPrice(p.price) : '₹' + Number(p.price || 0).toLocaleString('en-IN')) + '</span>'
            + '<span class="detail-price-period">/month</span>'
            + '<span class="detail-deposit"><strong>Deposit:</strong> ' + (typeof formatPrice === 'function' ? formatPrice(p.deposit || p.price * 2) : '') + '</span>'
            + '</div>'
            + '<h2 class="detail-section-title">Amenities</h2>'
            + '<div class="detail-amenities-grid">'
            + (Array.isArray(p.amenities) ? p.amenities.map((a) => '<div class="detail-amenity"><i class="fas fa-check-circle"></i> ' + esc(a) + '</div>').join('') : '')
            + '<div class="detail-amenity"><i class="fas ' + (p.petFriendly ? 'fa-paw' : 'fa-ban') + '"></i> ' + (p.petFriendly ? 'Pet Friendly' : 'No Pets') + '</div>'
            + '<div class="detail-amenity"><i class="fas ' + (p.furnished ? 'fa-couch' : 'fa-box-open') + '"></i> ' + (p.furnished ? 'Fully Furnished' : 'Unfurnished') + '</div>'
            + '<div class="detail-amenity"><i class="fas fa-shield-halved"></i> 24/7 Security</div>'
            + '</div>'
            + '<h2 class="detail-section-title">Comfort Scores</h2>'
            + '<div class="comfort-detail-grid">'
            + comfortCard('fa-volume-low', p.quietness || 0, 'Quietness')
            + comfortCard('fa-sun', p.sunlight || 0, 'Sunlight')
            + comfortCard('fa-car', p.commute || 0, 'Commute')
            + '</div>'
            + '<h2 class="detail-section-title">About This Property</h2>'
            + '<p class="detail-description">' + esc(p.description || 'A beautiful property listed by a verified owner on HeavenLease. Contact the owner directly to schedule a viewing and learn more about this home.') + '</p>'
            + '<h2 class="detail-section-title">Owner</h2>'
            + '<div class="owner-card">'
            + '<div class="owner-avatar"><i class="fas fa-user"></i></div>'
            + '<div class="owner-info">'
            + '<strong>' + esc(p.owner || 'Verified Owner') + '</strong>'
            + (p.contactLocked
                ? '<span class="owner-verified" style="color:#B45309;"><i class="fas fa-lock"></i> Contact details locked — subscribe to unlock phone & email</span>'
                    + '<a href="payment?redirect=property-detail?id=' + esc(p.id) + '" class="btn btn-primary" style="margin-top:10px;width:100%;"><i class="fas fa-unlock"></i> Unlock Contacts</a>'
                : '<span class="owner-verified"><i class="fas fa-check-circle"></i> Document Verified</span>'
                    + '<span class="owner-contact" style="display:block;margin-top:6px;"><i class="fas fa-phone"></i> ' + esc(p.phone || p.ownerPhone || '—') + '</span>'
                    + '<span class="owner-contact" style="display:block;"><i class="fas fa-envelope"></i> ' + esc(p.email || p.ownerEmail || '—') + '</span>')
            + '</div></div></div>';

        /* ===== Favorite toggle ===== */
        const favBtn = document.getElementById('detailFavorite');
        if (favBtn) {
            favBtn.addEventListener('click', () => {
                const icon = favBtn.querySelector('i');
                if (favBtn.classList.contains('active')) {
                    favBtn.classList.remove('active');
                    icon.classList.remove('fas');
                    icon.classList.add('far');
                } else {
                    favBtn.classList.add('active');
                    icon.classList.remove('far');
                    icon.classList.add('fas');
                }
            });
        }

        /* ===== Chat gate ===== */
        if (chatOwnerBtn && p.contactLocked) {
            chatOwnerBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (!api.isAuthenticated()) {
                    window.location.href = 'login?redirect=property-detail?id=' + p.id;
                    return;
                }
                window.location.href = 'payment?redirect=property-detail?id=' + p.id;
            });
        }

        /* ===== Booking form (real backend) ===== */
        if (bookingForm) {
            bookingForm.addEventListener('submit', (e) => {
                e.preventDefault();
                if (p.contactLocked) {
                    showToast('Subscribe to unlock the owner’s contact and book a tour.', 'error');
                    setTimeout(() => { window.location.href = 'payment?redirect=property-detail?id=' + p.id; }, 1200);
                    return;
                }
                if (!api.isAuthenticated()) {
                    showToast('Please sign in to book a tour.', 'error');
                    setTimeout(() => { window.location.href = 'login?redirect=property-detail?id=' + p.id; }, 1200);
                    return;
                }
                const user = api.getUser();
                if (!user || !user.id) {
                    showToast('Please sign in to book a tour.', 'error');
                    setTimeout(() => { window.location.href = 'login?redirect=property-detail?id=' + p.id; }, 1200);
                    return;
                }
                const inputs = bookingForm.querySelectorAll('input, select, textarea');
                const payload = {
                    propertyId: Number(p.id),
                    tenantId: Number(user.id),
                    ownerId: Number(p.ownerId) || 0,
                    tourDate: inputs[2] ? inputs[2].value : '',
                    tourTime: inputs[3] ? inputs[3].value : '',
                    tenantName: inputs[0] ? inputs[0].value : '',
                    tenantPhone: inputs[1] ? inputs[1].value : '',
                    message: inputs[4] ? inputs[4].value : '',
                    propertyTitle: p.title
                };
                const submitBtn = bookingForm.querySelector('button[type="submit"]');
                const originalText = submitBtn ? submitBtn.innerHTML : '';
                if (submitBtn) { submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...'; submitBtn.disabled = true; }
                api.createBooking(payload)
                    .then(() => {
                        if (bookingForm) bookingForm.reset();
                        showToast('Tour request sent! Redirecting to confirm your booking...', 'success');
                        setTimeout(() => {
                            const query = new URLSearchParams({
                                property: p.title || '',
                                name: payload.tenantName,
                                phone: payload.tenantPhone,
                                date: payload.tourDate,
                                time: payload.tourTime
                            });
                            window.location.href = 'tour-booking?' + query.toString();
                        }, 1000);
                    })
                    .catch((err) => {
                        showToast((err && err.message) || 'Booking failed. Please verify your email/phone.', 'error');
                    })
                    .finally(() => {
                        if (submitBtn) { submitBtn.innerHTML = originalText; submitBtn.disabled = false; }
                    });
            });
        }
    }
/* ===== Load real property from backend ===== */
    if (typeof fetchApiProperties === 'function') {
        fetchApiProperties(0, 200).then((list) => {
            if (list && list.length > 0) {
                allProperties = list;
                const found = list.find((x) => Number(x.id) === propertyId) || list[0];
                property = found;
            }
            renderDetail(property);
        }).catch(() => renderDetail(property));
    } else {
        renderDetail(property);
    }
})();