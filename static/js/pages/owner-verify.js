/* ============================================================
 * HeavenLease — Owner Verify module
 * Owner verification application for renting out properties.
 * Extracted from owner-verify.html.
 * Requires js/api.js + js/core.js loaded first.
 * ============================================================ */
(function () {
    'use strict';

    const navbar = document.getElementById('navbar');
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.getElementById('navLinks');

    if (navbar) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) navbar.classList.add('scrolled');
            else navbar.classList.remove('scrolled');
        });
    }
    if (hamburger) hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        if (navLinks) navLinks.classList.toggle('active');
    });
    if (hamburger && navLinks) document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            navLinks.classList.remove('active');
        });
    });

    const user = api.getUser();
    if (user) {
        const fn = document.getElementById('fullName');
        const em = document.getElementById('email');
        if (fn) fn.value = user.name || '';
        if (em) em.value = user.email || '';
    }

    function handleIdUpload(input) {
        if (input.files.length > 0) {
            const file = input.files[0];
            document.getElementById('idFileName').textContent = 'Uploaded: ' + file.name + ' (' + (file.size / 1024).toFixed(1) + ' KB)';
            document.getElementById('idSuccess').classList.add('show');
            document.getElementById('idUploadArea').style.opacity = '0.5';
            document.getElementById('idUploadArea').style.pointerEvents = 'none';
        }
    }
    window.handleIdUpload = handleIdUpload;

    function handleOwnUpload(input) {
        if (input.files.length > 0) {
            const file = input.files[0];
            document.getElementById('ownFileName').textContent = 'Uploaded: ' + file.name + ' (' + (file.size / 1024).toFixed(1) + ' KB)';
            document.getElementById('ownSuccess').classList.add('show');
            document.getElementById('ownUploadArea').style.opacity = '0.5';
            document.getElementById('ownUploadArea').style.pointerEvents = 'none';
        }
    }
    window.handleOwnUpload = handleOwnUpload;

    window.submitVerification = async function () {
        const fullName = document.getElementById('fullName').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const email = document.getElementById('email').value.trim();
        const propertyAddress = document.getElementById('propertyAddress').value.trim();
        const hasId = document.getElementById('idFile').files.length > 0;
        const hasOwn = document.getElementById('ownFile').files.length > 0;

        if (!fullName || !phone || !email || !propertyAddress) {
            showToast('Please fill in all personal details.', 'error'); return;
        }
        if (!hasId || !hasOwn) {
            showToast('Please upload both ID proof and ownership proof.', 'error'); return;
        }

        const btn = document.getElementById('submitVerify');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

        try {
            const application = {
                fullName, email, phone, propertyAddress,
                ownershipProofUrl: 'id:' + (document.getElementById('idFile').files[0] ? document.getElementById('idFile').files[0].name : ''),
                status: 'pending'
            };
            await api.createOwnerApplication(application);

            showToast('Verification submitted! Our team will review within 24-48 hours.', 'success');
            setTimeout(() => { window.location.href = 'dashboard'; }, 1500);
        } catch (error) {
            showToast(error.message || 'Failed to submit verification. Please try again.', 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit for Verification';
        }
    };
})();