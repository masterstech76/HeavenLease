/* ============================================================
 * HeavenLease — Verify Account module
 * Email or phone OTP verification with self-hosted preview.
 * Extracted from verify-account.html (head back-button guard +
 * main body logic).
 * Requires js/api.js + js/core.js loaded first.
 * ============================================================ */
(function () {
    'use strict';

    // Verification is deliberately a post-login step.
    if (!window.api || !api.isAuthenticated()) {
        window.location.replace('login?redirect=verify-account');
        return;
    }

    const params = new URLSearchParams(window.location.search);
    let email = params.get('email');
    let phone = params.get('phone');

    const target = document.getElementById('verifyTarget');
    const loadCurrentUser = async () => {
        try {
            const me = await api.getMe();
            if (me && me.verified) {
                showToast('Your account is already verified.', 'success');
                setTimeout(() => window.location.replace('dashboard'), 400);
                return false;
            }
            email = email || (me && me.email) || '';
            phone = phone || (me && me.phone) || '';
            if (email && target) target.textContent = email;
            else if (phone && target) target.textContent = '+91 ' + phone;
            return true;
        } catch (e) {
            return false;
        }
    };

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

    // Resolve the authenticated user's verification target before enabling actions.
    loadCurrentUser();

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
            const resend = document.querySelector('.resend-link');
            if (resend) resend.style.display = 'none';
            showToast('Account verified successfully! 🎉', 'success');
            setTimeout(() => {
                window.location.replace('dashboard');
            }, 900);
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