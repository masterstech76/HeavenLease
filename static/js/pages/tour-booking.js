/* ============================================================
 * HeavenLease — Tour Booking page module
 * Live property dropdown, date/time selection, real booking
 * creation. Extracted from tour-booking.html.
 * Requires js/api.js + js/core.js loaded first.
 * ============================================================ */
(function () {
    'use strict';

    const navbar = document.getElementById('navbar');
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.getElementById('navLinks');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50 && navbar) navbar.classList.add('scrolled');
        else if (navbar) navbar.classList.remove('scrolled');
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

    /* ===== Live property list ===== */
    const select = document.getElementById('propertySelect');
    if (!select) return;
    let liveProperties = [];

    function updateSummary() {
        const prop = liveProperties.find((p) => Number(p.id) === Number(select.value));
        set('sumProperty', prop ? (prop.title || 'Property') : '—');
        const dateEl = document.getElementById('tourDate');
        set('sumDate', dateEl ? dateEl.value || '—' : '—');
        set('sumTime', selectedTime || '—');
    }
    function set(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }

    function populateSelect(list) {
        list.forEach((p) => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = (p.title || 'Property') + ' — ' + (p.location || p.city || '');
            select.appendChild(opt);
        });
        const propParam = new URLSearchParams(window.location.search).get('property');
        if (propParam) {
            const match = list.find((p) => (p.title || '').toLowerCase().includes(propParam.toLowerCase()));
            if (match) select.value = match.id;
        }
        updateSummary();
    }

    if (typeof fetchApiProperties === 'function') {
        fetchApiProperties(0, 200).then((list) => {
            liveProperties = list;
            populateSelect(list);
        }).catch(() => populateSelect([]));
    } else {
        populateSelect([]);
    }

    let selectedTime = '';

    window.selectTime = function (el) {
        document.querySelectorAll('.time-slot').forEach((s) => s.classList.remove('selected'));
        el.classList.add('selected');
        selectedTime = el.getAttribute('data-time');
        updateSummary();
    };

    select.addEventListener('change', updateSummary);
    const dateEl = document.getElementById('tourDate');
    if (dateEl) dateEl.addEventListener('change', updateSummary);

    window.bookTour = function () {
        if (!select.value) { showToast('Please select a property.', 'error'); return; }
        const dateEl = document.getElementById('tourDate');
        if (!dateEl || !dateEl.value) { showToast('Please select a tour date.', 'error'); return; }
        if (!selectedTime) { showToast('Please select a preferred time.', 'error'); return; }
        const nameEl = document.getElementById('tourName');
        const phoneEl = document.getElementById('tourPhone');
        if (!nameEl || !nameEl.value || !phoneEl || !phoneEl.value) { showToast('Please fill in your name and phone number.', 'error'); return; }
        if (!api.isAuthenticated()) {
            showToast('Please sign in to book a tour.', 'error');
            setTimeout(() => { window.location.href = 'login?redirect=tour-booking'; }, 1200);
            return;
        }

        const prop = liveProperties.find((p) => Number(p.id) === Number(select.value));
        const user = api.getUser();
        const payload = {
            propertyId: Number(select.value),
            tenantId: user ? Number(user.id) : 0,
            ownerId: prop ? Number(prop.ownerId) || 0 : 0,
            tourDate: dateEl.value,
            tourTime: selectedTime,
            tenantName: nameEl.value,
            tenantPhone: phoneEl.value,
            message: '',
            propertyTitle: prop ? (prop.title || 'Property') : 'Property'
        };

        const btn = document.getElementById('bookTourBtn');
        const original = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Booking...';

        api.createBooking(payload)
            .then(() => {
                document.getElementById('bookingCard').style.display = 'none';
                document.getElementById('successScreen').classList.add('show');
                document.getElementById('successText').textContent = 'Your tour for ' + (prop ? prop.title : 'Property') + ' on ' + dateEl.value + ' at ' + selectedTime + ' has been requested. The owner will confirm shortly.';
                showToast('Tour booked successfully! 🎉', 'success');
            })
            .catch((err) => {
                showToast((err && err.message) || 'Booking failed. Please verify your email/phone.', 'error');
            })
            .finally(() => {
                btn.disabled = false;
                btn.innerHTML = original;
            });
    };

    updateSummary();
})();