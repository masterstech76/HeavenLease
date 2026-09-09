/* ============================================================
 * HeavenLease — Sign Up module
 * Full signup flow: role selection, form validation,
 * email-OTP verification, and Google account creation.
 * Extracted from signup.html (head back-button guard +
 * main body logic).
 * Requires js/api.js + js/core.js loaded first.
 * ============================================================ */
(function () {
    'use strict';

    // Back-button auth guard — if a session already exists, never show this auth page.
    try {
        if (localStorage.getItem('heavenlease_token') || sessionStorage.getItem('heavenlease_token')) {
            location.replace('home');
            return;
        }
    } catch (e) { /* storage unavailable — ignore */ }

    let selectedRole = 'TENANT';
    let pendingSignupData = null;

    function selectRole(el) {
        document.querySelectorAll('.role-option').forEach(r => r.classList.remove('selected'));
        el.classList.add('selected');
        selectedRole = el.dataset.role;
    }
    window.selectRole = selectRole;

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
        btn.innerHTML = 'Resend in ' + seconds + 's';
        const interval = setInterval(() => {
            seconds--;
            if (seconds <= 0) {
                clearInterval(interval);
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-paper-plane"></i> Resend OTP';
            } else {
                btn.innerHTML = 'Resend in ' + seconds + 's';
            }
        }, 1000);
    }

    document.getElementById('signupForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fullName = document.getElementById('fullName').value.trim();
        const email = document.getElementById('email').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (!fullName || !email || !phone || !password || !confirmPassword) {
            showToast('Please fill in all fields.', 'error');
            return;
        }
        if (!isValidEmail(email)) {
            showToast('Please enter a valid email address.', 'error');
            return;
        }
        if (!isValidPhone(phone)) {
            showToast('Please enter a valid 10-digit phone number.', 'error');
            return;
        }
        if (password.length < 8) {
            showToast('Password must be at least 8 characters.', 'error');
            return;
        }
        if (password !== confirmPassword) {
            showToast('Passwords do not match.', 'error');
            return;
        }

        const btn = document.getElementById('signupSubmitBtn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending OTP...';

        try {
            pendingSignupData = { fullName, email, phone, password, role: selectedRole };
            const res = await api.sendSignupCode(email);

            document.getElementById('otpSection').classList.add('show');
            document.getElementById('otpTarget').textContent = email;
            clearOtp();
            btn.style.display = 'none';

            showToast('OTP sent to your email. Please verify to complete signup.', 'success');
            startCountdown('resendOtpBtn');
        } catch (error) {
            showToast(error.message || 'Failed to send OTP.', 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
        }
    });
window.verifySignupOtp = async function () {
        if (!pendingSignupData) {
            showToast('Please fill the form first.', 'error');
            return;
        }
        const code = getOtpValue();
        if (code.length !== 6) {
            showToast('Please enter the 6-digit OTP.', 'error');
            return;
        }
        const btn = document.getElementById('verifyOtpBtn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';
        try {
            const captchaToken = await getCaptchaToken('signup');
            const data = await api.signup({
                fullName: pendingSignupData.fullName,
                email: pendingSignupData.email,
                phone: pendingSignupData.phone,
                password: pendingSignupData.password,
                role: pendingSignupData.role || 'TENANT',
                captchaToken,
                code
            });
            showToast('Account created successfully! Welcome to HeavenLease! 🎉', 'success');
            setTimeout(() => {
                const role = String((data && data.role) || '').toUpperCase();
                if (role === 'TENANT') window.location.replace('dashboard');
                else if (role === 'OWNER' || role === 'VERIFIED_OWNER') window.location.replace('dashboard');
                else if (role === 'ADMIN') window.location.replace('admin-dashboard');
                else window.location.replace('home');
            }, 1000);
        } catch (error) {
            showToast(error.message || 'Verification failed. Please try again.', 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-check-circle"></i> Verify & Create Account';
        }
    };

    window.resendOtp = async function () {
        if (!pendingSignupData) return;
        try {
            await api.sendSignupCode(pendingSignupData.email);
            showToast('OTP resent to your email.', 'success');
            startCountdown('resendOtpBtn');
        } catch (error) {
            showToast(error.message || 'Failed to resend OTP.', 'error');
        }
    };

    /* ===== Google sign-in ===== */
    let googleClientId = '';

    function googleSdkReady() {
        return window.google && google.accounts && google.accounts.id;
    }

    async function loadGoogleClientId() {
        try {
            const cfg = await api.getPublicConfig().catch(() => null);
            googleClientId = (cfg && cfg.googleClientId) ? cfg.googleClientId : '';
        } catch (e) {
            googleClientId = '';
        }
        updateGoogleAuthVisibility();
        if (googleClientId) renderGoogleButton();
    }

    function updateGoogleAuthVisibility() {
        const btn = document.getElementById('googleBtn');
        const divider = document.querySelector('.auth-divider');
        if (btn) { btn.style.display = ''; btn.disabled = false; }
        if (divider) divider.style.display = '';
    }

    function ensureGoogleSdk(cb) {
        if (googleSdkReady()) { cb(); return; }
        const s = document.createElement('script');
        s.src = 'https://accounts.google.com/gsi/client';
        s.async = true;
        s.onload = cb;
        s.onerror = function () { showToast('Could not load Google sign-in. Please try again.', 'error'); };
        document.head.appendChild(s);
    }

    function onGoogleCredential(response) {
        const btn = document.getElementById('googleBtn');
        if (!response || !response.credential) {
            showToast('Google signup was cancelled.', 'error');
            return;
        }
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...'; }
        api.googleLogin(response.credential, true, selectedRole)
            .then((data) => {
                showToast('Account created with Google successfully!', 'success');
                const gearRole = String((data && data.role) || '').toUpperCase();
                setTimeout(() => {
                    if (gearRole === 'TENANT') window.location.replace('dashboard');
                    else if (gearRole === 'OWNER' || gearRole === 'VERIFIED_OWNER') window.location.replace('dashboard');
                    else window.location.replace('home');
                }, 200);
            })
            .catch(error => {
                showToast(error.message || 'Google signup failed.', 'error');
                if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fab fa-google"></i> Google'; }
            });
    }

    function renderGoogleButton() {
        const btn = document.getElementById('googleBtn');
        if (!btn) return;
        ensureGoogleSdk(function () {
            try {
                google.accounts.id.initialize({
                    client_id: googleClientId,
                    callback: onGoogleCredential
                });
                google.accounts.id.renderButton(btn, {
                    theme: 'outline',
                    size: 'large',
                    shape: 'pill',
                    text: 'continue_with',
                    width: Math.max(btn.clientWidth || 280, 280),
                    logo_alignment: 'left'
                });
            } catch (e) {
                showToast('Google sign-in could not start. Please try again.', 'error');
            }
        });
    }

    const googleBtn = document.getElementById('googleBtn');
    if (googleBtn) {
        googleBtn.addEventListener('click', function () {
            if (!googleClientId || !googleSdkReady()) {
                showToast('Google signup is not configured yet. Set GOOGLE_CLIENT_ID in .env or Admin → Integrations, then restart.', 'error');
            }
        });
    }

    loadGoogleClientId();
})();