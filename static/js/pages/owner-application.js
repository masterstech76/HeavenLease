/* ============================================================
 * HeavenLease — Owner Application module
 * 3-step owner application wizard (identity → document →
 * property) with backend submission.
 * Extracted from owner-application.html.
 * Requires js/api.js + js/core.js loaded first.
 * ============================================================ */
(function () {
    'use strict';

    // Navbar
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
    if (hamburger && navLinks) {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                navLinks.classList.remove('active');
            });
        });
    }

    let currentStep = 1;
    const totalSteps = 3;

    function updateProgress() {
        for (let i = 1; i <= totalSteps; i++) {
            const el = document.getElementById('prog' + i);
            el.classList.remove('active', 'done');
            if (i < currentStep) el.classList.add('done');
            if (i === currentStep) el.classList.add('active');
        }
        for (let i = 1; i <= totalSteps; i++) {
            document.getElementById('step' + i).classList.toggle('active', i === currentStep);
        }
    }

    window.nextStep = function () {
        if (currentStep === 1) {
            if (!document.getElementById('ownerName').value || !document.getElementById('ownerPhone').value || !document.getElementById('idNumber').value) {
                showToast('Please fill in all required fields.', 'error');
                return;
            }
        }
        if (currentStep === 2) {
            if (!document.getElementById('propType').value || !document.getElementById('docUpload').files.length) {
                showToast('Please upload your ownership document.', 'error');
                return;
            }
        }
        if (currentStep < totalSteps) {
            currentStep++;
            updateProgress();
        }
    };

    window.prevStep = function () {
        if (currentStep > 1) {
            currentStep--;
            updateProgress();
        }
    };

    window.handleUpload = function (input) {
        const box = document.getElementById('uploadBox');
        if (input.files.length > 0) {
            box.classList.add('uploaded');
            box.querySelector('strong').textContent = input.files[0].name;
            box.querySelector('span').textContent = 'Document uploaded successfully';
            box.querySelector('i').className = 'fas fa-check-circle';
        }
    };

    window.submitApplication = function () {
        if (!api.isAuthenticated()) {
            showToast('Please sign in to apply as a verified owner.', 'error');
            return;
        }
        if (!document.getElementById('propAddress').value || !document.getElementById('propCity').value || !document.getElementById('propRent').value) {
            showToast('Please fill in all required fields.', 'error');
            return;
        }

        const docInput = document.getElementById('docUpload');
        const payload = {
            fullName: document.getElementById('ownerName').value,
            email: document.getElementById('ownerEmail').value,
            phone: document.getElementById('ownerPhone').value,
            propertyAddress: document.getElementById('propAddress').value,
            ownershipProofUrl: docInput && docInput.files && docInput.files[0] ? docInput.files[0].name : ''
        };

        const btn = document.querySelector('.oa-nav .btn-primary');
        const original = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

        // REAL: submit to the backend — the application is stored server-side and
        // an admin reviews it. The user is only marked verified by an admin action.
        api.createOwnerApplication(payload)
            .then(() => {
                try {
                    const user = JSON.parse(localStorage.getItem('heavenlease_user') || '{}');
                    user.ownershipPending = true;
                    localStorage.setItem('heavenlease_user', JSON.stringify(user));
                } catch (e) { /* non-critical */ }
                document.getElementById('formBody').style.display = 'none';
                document.getElementById('successScreen').classList.add('show');
                showToast('Application submitted! An admin will review it shortly.', 'success');
            })
            .catch((err) => {
                showToast((err && err.message) || 'Could not submit your application. Please try again.', 'error');
            })
            .finally(() => {
                btn.disabled = false;
                btn.innerHTML = original;
            });
    };

    updateProgress();
})();