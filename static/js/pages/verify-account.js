/* ============================================================
 * HeavenLease — Verify Account module
 * Email or phone OTP verification with self-hosted preview.
 * Extracted from verify-account.html (head back-button guard +
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

    // Read email/phone from URL params
    const params = new URLSearchParams(window.location.search);
    const email = params.get('email');
    const phone = params.get('phone');

    const target = document.getElementById('verifyTarget');
    if (email && target) target.textContent = email;
    if (phone && target) target.textContent = '+91 ' + phone;

    function handleOtpInput(el) {
        el.value = el.value.replace(/\D/g, '').slice(0, 1);
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

    // Verify account — preserve the existing API calls and redirect flow.
    window.verifyAccount = async function () {
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
            showToast('Account verified successfully! 🎉', 'success');
            setTimeout(() => {
                window.location.replace('home');
            }, 1500);
        } catch (error) {
            showToast(error.message || 'Verification failed. Please try again.', 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-check-circle"></i> Verify Account';
        }
    };

    // Resend OTP — preserve the existing API calls and countdown.
    window.resendCode = async function () {
        try {
            if (email) {
                await api.sendVerification(email);
            } else if (phone) {
                await api.sendSmsOtp(phone);
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