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