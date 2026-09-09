/* ============================================================
 * HeavenLease — Verify Email module
 * Full-page email verification with numeric OTP inputs,
 * backspace navigation, secure redirect via URL params.
 * Extracted from verify-email.html (head back-button guard +
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

    // Read email + redirect from URL params
    const params = new URLSearchParams(window.location.search);
    const email = params.get('email');
    const redirect = params.get('redirect');

    const emailDisplay = document.getElementById('emailDisplay');
    if (email && emailDisplay) emailDisplay.textContent = email;

    function handleOtpInput(el) {
        el.value = el.value.replace(/\D/g, '').slice(-1);
        if (el.value.length === 1) {
            const next = el.nextElementSibling;
            if (next) next.focus();
        }
    }
    window.handleOtpInput = handleOtpInput;

    // Support backspace navigation without changing the verification flow.
    document.querySelectorAll('#otpInputs .otp-digit').forEach((input) => {
        input.addEventListener('keydown', (event) => {
            if (event.key === 'Backspace' && !input.value) {
                const previous = input.previousElementSibling;
                if (previous) {
                    previous.focus();
                    previous.value = '';
                }
            }
        });
    });

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

    // Verify email
    window.verifyEmail = async function () {
        const code = getOtpValue();
        if (code.length !== 6) {
            showToast('Please enter the 6-digit OTP.', 'error');
            return;
        }
        if (!email) {
            showToast('Email is required. Please go back and try again.', 'error');
            return;
        }
        const btn = document.getElementById('verifyBtn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin" aria-hidden="true"></i><span>Verifying...</span>';
        try {
            await api.verifyEmail(email, code);
            document.getElementById('successSection').style.display = 'block';
            document.querySelector('.otp-inputs').style.display = 'none';
            document.getElementById('verifyBtn').style.display = 'none';
            document.querySelector('.resend-link').style.display = 'none';
            showToast('Email verified successfully! 🎉', 'success');
            setTimeout(() => {
                window.location.replace(redirect || 'home');
            }, 1500);
        } catch (error) {
            showToast(error.message || 'Verification failed. Please try again.', 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-check-circle" aria-hidden="true"></i><span>Verify Email</span>';
        }
    };

    // Resend code
    window.resendCode = async function () {
        if (!email) {
            showToast('Email is required.', 'error');
            return;
        }
        try {
            await api.sendVerification(email);
            showToast('Verification code resent to your email.', 'success');
            startCountdown('resendBtn');
        } catch (error) {
            showToast(error.message || 'Failed to resend code.', 'error');
        }
    };

    // Start countdown on load
    startCountdown('resendBtn');
})();