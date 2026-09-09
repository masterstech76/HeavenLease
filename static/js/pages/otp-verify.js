/* ============================================================
 * HeavenLease — OTP Verification module
 * Full-page OTP verification for email or phone with a
 * self-hosted on-screen code preview (IN_APP delivery).
 * Extracted from otp-verify.html (head back-button guard +
 * main body logic).
 * Requires js/api.js + js/core.js loaded first.
 * ============================================================ */
(function () {
    'use strict';

    // Back-button auth guard — never show this page to an active session.
    try {
        if (localStorage.getItem('heavenlease_token') || sessionStorage.getItem('heavenlease_token')) {
            location.replace('home');
            return;
        }
    } catch (e) { /* storage unavailable — ignore */ }

    // Read email/phone/redirect from URL params
    const params = new URLSearchParams(window.location.search);
    const email = params.get('email');
    const phone = params.get('phone');
    const redirect = params.get('redirect');
    const otpTarget = document.getElementById('otpTarget');
    if (email) otpTarget.textContent = email;
    if (phone) otpTarget.textContent = '+91 ' + phone;

    function handleOtpInput(el) {
        if (el.value.length === 1) {
            const next = el.nextElementSibling;
            if (next) next.focus();
        }
    }
    window.handleOtpInput = handleOtpInput;

    function getOtpValue() {
        const inputs = document.querySelectorAll('#otpInputs .otp-digit');
        return Array.from(inputs).map(i => i.value).join('');
    }

    function startCountdown(btnId) {
        const btn = document.getElementById(btnId);
        if (!btn) return;
        let seconds = 30;
        btn.disabled = true;
        btn.textContent = 'Resend in ' + seconds + 's';
        const interval = setInterval(() => {
            seconds--;
            if (seconds <= 0) {
                clearInterval(interval);
                btn.disabled = false;
                btn.textContent = 'Resend';
            } else {
                btn.textContent = 'Resend in ' + seconds + 's';
            }
        }, 1000);
    }

    /* ===== Verify OTP ===== */
    window.verifyOtp = async function () {
        const code = getOtpValue();
        if (code.length !== 6) {
            showToast('Please enter the 6-digit OTP.', 'error');
            return;
        }
        const btn = document.getElementById('verifyBtn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';
        try {
            if (email) {
                await api.verifyEmail(email, code);
            } else if (phone) {
                await api.verifySmsOtp(phone, code);
            } else {
                throw new Error('Missing verification target.');
            }
            document.getElementById('successSection').style.display = 'block';
            document.querySelector('.otp-inputs').style.display = 'none';
            document.getElementById('verifyBtn').style.display = 'none';
            document.querySelector('.resend-link').style.display = 'none';
            showToast('OTP verified successfully! 🎉', 'success');
            setTimeout(() => {
                window.location.replace(redirect || 'home');
            }, 1500);
        } catch (error) {
            showToast(error.message || 'Verification failed. Please try again.', 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-check-circle"></i> Verify OTP';
        }
    };

    /* ===== Resend OTP ===== */
    window.resendOtp = async function () {
        try {
            const previewBox = document.getElementById('otpPreviewBox');
            const previewValue = document.getElementById('otpPreviewValue');
            if (email) {
                await api.sendVerification(email);
                if (previewBox) previewBox.style.display = 'none';
            } else if (phone) {
                const res = await api.sendSmsOtp(phone);
                if (res && res.deliveryChannel === 'IN_APP' && res.otpPreview) {
                    if (previewBox) previewBox.style.display = 'block';
                    if (previewValue) previewValue.textContent = res.otpPreview;
                } else if (previewBox) {
                    previewBox.style.display = 'none';
                }
            } else {
                throw new Error('Missing verification target.');
            }
            showToast('OTP resent successfully.', 'success');
            startCountdown('resendBtn');
        } catch (error) {
            showToast(error.message || 'Failed to resend OTP.', 'error');
        }
    };

    // Start countdown on load
    startCountdown('resendBtn');
})();