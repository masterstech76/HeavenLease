/* ============================================================
 * HeavenLease — Forgot Password module
 * 3-step: send OTP → verify OTP → redirect to reset-password.
 * Extracted from forgot-password.html.
 * Requires js/api.js + js/core.js (isValidEmail) first.
 * ============================================================ */
(function () {
    'use strict';

    let forgotEmail = '';

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

    function clearOtp() {
        document.querySelectorAll('#otpInputs .otp-digit').forEach(i => i.value = '');
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

    /* ===== Step 1: Send OTP ===== */
    document.getElementById('forgotForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        forgotEmail = document.getElementById('email').value.trim();
        if (!forgotEmail || !isValidEmail(forgotEmail)) {
            showToast('Please enter a valid email address.', 'error');
            return;
        }
        const btn = document.getElementById('sendOtpBtn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending OTP...';

        try {
            const res = await api.forgotPassword(forgotEmail);
            document.getElementById('otpSection').classList.add('show');
            document.getElementById('otpTarget').textContent = forgotEmail;
            clearOtp();
            btn.style.display = 'none';
            showToast('If the email exists, a reset code has been sent. Check your inbox.', 'success');
            startCountdown('resendOtpBtn');
        } catch (error) {
            showToast(error.message || 'Failed to send OTP.', 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send OTP';
        }
    });

    /* ===== Step 2: Verify OTP ===== */
    window.verifyForgotOtp = async function () {
        const code = getOtpValue();
        if (code.length !== 6) {
            showToast('Please enter the 6-digit OTP.', 'error');
            return;
        }
        const btn = document.getElementById('verifyOtpBtn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';
        try {
            const data = await api.verifyResetOtp(forgotEmail, code);
            showToast('OTP verified! Create your new password.', 'success');
            setTimeout(() => {
                window.location.href = 'reset-password?email=' + encodeURIComponent(forgotEmail) + '&token=' + encodeURIComponent(data.resetToken);
            }, 1000);
        } catch (error) {
            showToast(error.message || 'Invalid OTP. Please try again.', 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-check-circle"></i> Verify OTP';
        }
    };

    /* ===== Resend OTP ===== */
    window.resendOtp = async function () {
        if (!forgotEmail) return;
        try {
            const res = await api.forgotPassword(forgotEmail);
            showToast('If the email exists, a reset code has been sent to your email.', 'success');
            startCountdown('resendOtpBtn');
        } catch (error) {
            showToast(error.message || 'Failed to resend OTP.', 'error');
        }
    };
})();