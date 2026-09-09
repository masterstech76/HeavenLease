/* ============================================================
 * HeavenLease — Login page module
 * Auth guard, tabs, password/email-OTP/phone-OTP login, Google.
 * Extracted from login.html.
 * Requires js/api.js (incl. isValidEmail/isValidPhone/getCaptchaToken)
 * + js/core.js + Google GSI client first.
 * ============================================================ */
(function () {
    'use strict';

    /* ===== Auth guard ===== */
    try {
        if (localStorage.getItem('heavenlease_token') || sessionStorage.getItem('heavenlease_token')) {
            location.replace('home');
        }
    } catch (e) { /* storage unavailable — ignore */ }

    /* ===== Tabs ===== */
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
        });
    });

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

    function getOtpValue(containerId) {
        const inputs = document.querySelectorAll('#' + containerId + ' .otp-digit');
        return Array.from(inputs).map(i => i.value).join('');
    }
    window.getOtpValue = getOtpValue;

    function clearOtp(containerId) {
        document.querySelectorAll('#' + containerId + ' .otp-digit').forEach(i => i.value = '');
    }
    window.clearOtp = clearOtp;

    function getRedirect() {
        const params = new URLSearchParams(window.location.search);
        return params.get('redirect');
    }

    function redirectAfterLogin(role) {
        const redirect = getRedirect();
        if (redirect && redirect !== '/' && !redirect.startsWith('/?') && !redirect.startsWith('/#')) {
            window.location.replace(redirect);
        } else {
            const r = String(role || '').toUpperCase();
            if (r === 'TENANT') window.location.replace('dashboard');
            else if (r === 'OWNER' || r === 'VERIFIED_OWNER') window.location.replace('dashboard');
            else if (r === 'ADMIN') window.location.replace('admin-dashboard');
            else window.location.replace('home');
        }
/* ===== Password login ===== */
    document.getElementById('passwordLoginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        if (!email || !password) { showToast('Please fill in all fields.', 'error'); return; }
        const btn = document.getElementById('passwordSubmitBtn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';
        try {
            const captchaToken = await getCaptchaToken('login');
            const remember = document.getElementById('rememberMe').checked;
            const data = await api.login(email, password, captchaToken, remember);
            showToast('Signed in successfully! Welcome back.', 'success');
            setTimeout(() => redirectAfterLogin(data.role), 800);
        } catch (error) {
            showToast(error.message || 'Invalid email or password.', 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
        }
    });

    /* ===== Email OTP ===== */
    window.sendEmailOtp = async function () {
        const email = document.getElementById('otpEmail').value.trim();
        if (!email || !isValidEmail(email)) { showToast('Please enter a valid email address.', 'error'); return; }
        const btn = document.getElementById('sendEmailOtpBtn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending OTP...';
        try {
            const res = await api.sendVerification(email);
            document.getElementById('emailOtpSection').style.display = 'block';
            document.getElementById('emailOtpTarget').textContent = email;
            clearOtp('emailOtpInputs');
            showToast('OTP sent to your email. Check your inbox.', 'success');
        } catch (error) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send OTP to Email';
            showToast(error.message || 'Failed to send OTP.', 'error');
            return;
        }
        startOtpCountdown('sendEmailOtpBtn', '<i class="fas fa-paper-plane"></i> Resend OTP');
    };

    window.verifyEmailOtpLogin = async function () {
        const email = document.getElementById('otpEmail').value.trim();
        const code = getOtpValue('emailOtpInputs');
        if (code.length !== 6) { showToast('Please enter the 6-digit OTP.', 'error'); return; }
        try {
            const remember = document.getElementById('rememberMe').checked;
            const data = await api.loginWithEmailOtp(email, code, remember);
            showToast('Signed in successfully!', 'success');
            setTimeout(() => { redirectAfterLogin(data.role); }, 800);
        } catch (error) {
            showToast(error.message || 'Invalid OTP. Please try again.', 'error');
        }
    };
/* ===== Phone OTP ===== */
    window.sendPhoneOtp = async function () {
        let phone = document.getElementById('otpPhone').value.trim();
        if (phone.startsWith('+91')) phone = phone.slice(3);
        if (!phone || !isValidPhone(phone)) { showToast('Please enter a valid 10-digit phone number.', 'error'); return; }
        const btn = document.getElementById('sendPhoneOtpBtn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending OTP...';
        try {
            const res = await api.sendSmsOtp(phone);
            document.getElementById('phoneOtpSection').style.display = 'block';
            document.getElementById('phoneOtpTarget').textContent = '+91 ' + phone;
            clearOtp('phoneOtpInputs');
            const previewBox = document.getElementById('phoneOtpPreviewBox');
            const previewValue = document.getElementById('phoneOtpPreviewValue');
            if (res && res.deliveryChannel === 'IN_APP' && res.otpPreview) {
                if (previewBox) previewBox.style.display = 'block';
                if (previewValue) previewValue.textContent = res.otpPreview;
            } else {
                if (previewBox) previewBox.style.display = 'none';
            }
            showToast((res && res.message) ? res.message : 'OTP sent to your phone.', 'success');
        } catch (error) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send OTP to Phone';
            showToast(error.message || 'Failed to send OTP.', 'error');
            return;
        }
        startOtpCountdown('sendPhoneOtpBtn', '<i class="fas fa-paper-plane"></i> Resend OTP');
    };

    window.verifyPhoneOtpLogin = async function () {
        let phone = document.getElementById('otpPhone').value.trim();
        if (phone.length > 10) phone = phone.slice(-10);
        const code = getOtpValue('phoneOtpInputs');
        if (code.length !== 6) { showToast('Please enter the 6-digit OTP.', 'error'); return; }
        try {
            const remember = document.getElementById('rememberMe').checked;
            const data = await api.loginWithPhoneOtp(phone, code, remember);
            showToast('Signed in successfully!', 'success');
            setTimeout(() => redirectAfterLogin(data.role), 800);
        } catch (error) {
            showToast(error.message || 'Invalid OTP. Please try again.', 'error');
        }
    };

    function startOtpCountdown(btnId, resendLabel) {
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
                if (resendLabel) btn.innerHTML = resendLabel;
            } else {
                btn.innerHTML = 'Resend in ' + seconds + 's';
            }
        }, 1000);
    }
/* ===== Google sign-in ===== */
    let googleClientId = '';
    function googleSdkReady() { return window.google && google.accounts && google.accounts.id; }

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
        if (!response || !response.credential) { showToast('Google login was cancelled.', 'error'); return; }
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...'; }
        api.googleLogin(response.credential, true)
            .then((data) => {
                showToast('Signed in with Google successfully!', 'success');
                setTimeout(() => redirectAfterLogin(data.role), 200);
            })
            .catch(error => {
                showToast(error.message || 'Google login failed.', 'error');
                if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fab fa-google"></i> Google'; }
            });
    }

    function renderGoogleButton() {
        const btn = document.getElementById('googleBtn');
        if (!btn) return;
        ensureGoogleSdk(function () {
            try {
                google.accounts.id.initialize({ client_id: googleClientId, callback: onGoogleCredential });
                google.accounts.id.renderButton(btn, {
                    theme: 'outline', size: 'large', shape: 'pill', text: 'continue_with',
                    width: Math.max(btn.clientWidth || 280, 280), logo_alignment: 'left'
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
                showToast('Google login is not configured yet. Set GOOGLE_CLIENT_ID in .env or Admin → Integrations, then restart.', 'error');
            }
        });
    }

    loadGoogleClientId();
})();
    }