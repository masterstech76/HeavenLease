/* ============================================================
 * HeavenLease — Reset Password module
 * Secure password reset using the short-lived reset token
 * issued after OTP verification.
 * Extracted from reset-password.html (guard + main logic).
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

    // Get email + reset token from URL (token is required — issued after OTP verification)
    const params = new URLSearchParams(window.location.search);
    const userEmail = params.get('email') || '';
    const resetToken = params.get('token') || '';

    // If no reset token, redirect back to forgot-password
    if (!resetToken) {
        showToast('Invalid or expired reset link. Please request a new one.', 'error');
        setTimeout(() => { window.location.href = 'forgot-password'; }, 1500);
    }

    function togglePassword(id, btn) {
        const input = document.getElementById(id);
        const icon = btn.querySelector('i');
        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            input.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    }
    window.togglePassword = togglePassword;

    const resetForm = document.getElementById('resetForm');
    if (resetForm) {
        resetForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            if (newPassword.length < 8) {
                showToast('Password must be at least 8 characters.', 'error');
                return;
            }
            if (newPassword !== confirmPassword) {
                showToast('Passwords do not match.', 'error');
                return;
            }
            const btn = document.getElementById('resetBtn');
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Resetting...';
            try {
                await api.resetPassword(userEmail, resetToken, newPassword);
                document.getElementById('resetForm').style.display = 'none';
                document.getElementById('successSection').style.display = 'block';
                showToast('Password reset successfully! 🎉', 'success');
            } catch (error) {
                showToast(error.message || 'Failed to reset password.', 'error');
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-check-circle"></i> Reset Password';
            }
        });
    }
})();