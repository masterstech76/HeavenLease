/* ============================================================
 * HeavenLease — Security Settings module
 * Change password form handler.
 * Extracted from security-settings.html.
 * Requires js/api.js + js/core.js loaded first.
 * ============================================================ */
(function () {
    'use strict';
    const form = document.getElementById('pwdForm');
    if (form) {
        form.addEventListener('submit', async function (ev) {
            ev.preventDefault();
            try {
                const cur = document.getElementById('pwdCurrent').value;
                const nw = document.getElementById('pwdNew').value;
                const conf = document.getElementById('pwdConfirm').value;
                if (nw.length < 8 || !/[A-Za-z]/.test(nw) || !/[0-9]/.test(nw)) { showToast('Password must be min 8 chars with letters and numbers.', 'error'); return; }
                if (nw !== conf) { showToast('Passwords do not match.', 'error'); return; }
                let cached = api.getUser() || {};
                let id = cached.id;
                if (!id) { const me = await api.getMe(); if (me && me.id) { id = me.id; cached = { ...cached, ...me }; } }
                if (!id) { showToast('Could not identify your account.', 'error'); return; }
                await api.updatePassword(id, nw, cur);
                showToast('Password updated successfully!', 'success');
                form.reset();
            } catch (e) { showToast(e.message || 'Password update failed.', 'error'); }
        });
    }
})();

// ===== Two-factor authentication =====
(async function initTwoFactor() {
    const status = document.getElementById('twofaStatus');
    if (!status) return;
    const emailBtn = document.getElementById('enableEmail2faBtn');
    const emailDisable = document.getElementById('disableEmail2faBtn');
    const setupBtn = document.getElementById('setupTotpBtn');
    const disableTotp = document.getElementById('disableTotpBtn');
    const setupBox = document.getElementById('totpSetupBox');
    const qr = document.getElementById('totpQr');
    const enableTotp = document.getElementById('enableTotpBtn');
    const code = document.getElementById('totpEnableCode');

    async function refresh() {
        try {
            const st = await api.getTwoFactorStatus();
            status.innerHTML = '<strong>Email OTP:</strong> ' + (st.emailEnabled ? 'Enabled' : 'Disabled') + ' &nbsp; · &nbsp; <strong>Authenticator:</strong> ' + (st.totpEnabled ? 'Enabled' : 'Disabled');
            emailBtn.style.display = st.emailEnabled ? 'none' : '';
            emailDisable.style.display = st.emailEnabled ? '' : 'none';
            setupBtn.style.display = st.totpEnabled ? 'none' : '';
            disableTotp.style.display = st.totpEnabled ? '' : 'none';
        } catch (e) { status.textContent = e.message || 'Unable to load 2FA status.'; }
    }
    emailBtn.onclick = async () => { try { await api.enableEmail2fa(); showToast('Email OTP 2FA enabled.', 'success'); refresh(); } catch(e) { showToast(e.message, 'error'); } };
    emailDisable.onclick = async () => { const pw = prompt('Enter your current password to disable Email OTP:'); if (!pw) return; try { await api.disableEmail2fa(pw); showToast('Email OTP 2FA disabled.', 'success'); refresh(); } catch(e) { showToast(e.message, 'error'); } };
    setupBtn.onclick = async () => { try { const d = await api.setupTotp(); qr.src = d.qrCode; setupBox.style.display='block'; showToast('Scan the QR code with your authenticator app.', 'success'); } catch(e) { showToast(e.message, 'error'); } };
    enableTotp.onclick = async () => { const v=code.value.trim(); if(!/^\d{6}$/.test(v)){showToast('Enter the 6-digit authenticator code.','error');return;} try { await api.enableTotp(v); setupBox.style.display='none'; code.value=''; showToast('Authenticator 2FA enabled.', 'success'); refresh(); } catch(e) { showToast(e.message, 'error'); } };
    disableTotp.onclick = async () => { const pw = prompt('Enter your current password to disable Authenticator 2FA:'); if (!pw) return; try { await api.disableTotp(pw); showToast('Authenticator 2FA disabled.', 'success'); refresh(); } catch(e) { showToast(e.message, 'error'); } };
    refresh();
})();
