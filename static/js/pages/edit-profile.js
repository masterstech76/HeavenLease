/* ============================================================
 * HeavenLease — Edit Profile module
 * Loads the user (cache + /me), saves profile, uploads avatar,
 * changes password, deactivate/delete account.
 * Extracted from edit-profile.html.
 * Requires js/api.js + js/core.js loaded first.
 * ============================================================ */
(function () {
    'use strict';

    /* ===== Auth guard ===== */
    if (!window.api || typeof api.isAuthenticated !== 'function' || !api.isAuthenticated()) {
        window.location.replace('login?redirect=edit-profile');
        return;
    }

    const navbar = document.getElementById('navbar');
    window.addEventListener('scroll', () => navbar.classList.toggle('scrolled', window.scrollY > 50));

    function applyProfile(me) {
        const cached = api.getUser() || {};
        const name = me.fullName || me.name || cached.name || cached.fullName || 'User';
        document.getElementById('profileSub').textContent = name + ' · ' + (me.email || cached.email || '');
        document.getElementById('fullName').value = name;
        document.getElementById('email').value = me.email || cached.email || '';
        document.getElementById('phone').value = me.phone || cached.phone || '';
        document.getElementById('username').value = me.username || cached.username || '';
        document.getElementById('bio').value = me.bio || cached.bio || '';
        document.getElementById('website').value = me.website || cached.website || '';
        document.getElementById('gender').value = me.gender || cached.gender || '';
        const avatar = api.resolveMedia(me.avatarUrl || cached.avatarUrl || '');
        const av1 = document.getElementById('profileAvatar');
        const av2 = document.getElementById('avatarEditAvatar');
        if (avatar) {
            av1.innerHTML = '<img src="' + avatar + '" alt="avatar">';
            av2.innerHTML = '<img src="' + avatar + '" alt="avatar">';
        } else {
            const initial = name.charAt(0).toUpperCase();
            av1.textContent = initial;
            av2.textContent = initial;
        }
        api.setUser(Object.assign({}, cached, {
            email: me.email || cached.email || '',
            role: me.role || cached.role || 'TENANT',
            name: name,
            phone: me.phone || cached.phone || '',
            username: me.username || cached.username || '',
            bio: me.bio || cached.bio || '',
            avatarUrl: me.avatarUrl || cached.avatarUrl || '',
            website: me.website || cached.website || '',
            gender: me.gender || cached.gender || '',
            verified: me.verified != null ? me.verified : cached.verified,
            id: me.id != null ? me.id : cached.id
        }));
        const badge = document.getElementById('verifyBadge');
        if (badge) {
            badge.className = me.verified ? 'verified-badge' : 'unverified-badge';
            badge.innerHTML = me.verified ? '<i class="fas fa-check-circle"></i> Verified' : '<i class="fas fa-clock"></i> Not Verified';
            badge.style.display = 'inline-flex';
        }
    }

    const cachedUser = api.getUser();
    if (cachedUser) applyProfile(cachedUser);
/* ===== Save profile ===== */
    const profileForm = document.getElementById('profileForm');
    const profileBtn = profileForm.querySelector('button[type=submit]');
    const SAVE = '<i class="fas fa-save"></i> Save Changes';
    function profileBusy(v) {
        profileBtn.disabled = v;
        profileBtn.innerHTML = v ? '<i class="fas fa-spinner fa-spin"></i> Saving…' : SAVE;
    }
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('fullName').value.trim();
        let phone = document.getElementById('phone').value.trim();
        let digits = phone.replace(/\D/g, '');
        if (digits.startsWith('91') && digits.length === 12) digits = digits.slice(2);
        if (digits.length === 10) phone = digits;
        if (!name) { showToast('Please enter your name.', 'error'); document.getElementById('fullName').focus(); return; }
        profileBusy(true);
        try {
            let cached = api.getUser() || {}, targetId = cached.id;
            if (!targetId) {
                const me = await api.getMe();
                if (me && me.id) { targetId = me.id; cached = Object.assign({}, cached, me); }
                else throw new Error('Could not load your account. Please log in again.');
            }
            const saved = await api.updateUser(targetId, {
                fullName: name, phone: phone,
                username: document.getElementById('username').value.trim(),
                bio: document.getElementById('bio').value.trim(),
                website: document.getElementById('website').value.trim(),
                gender: document.getElementById('gender').value
            });
            api.setUser(Object.assign({}, cached, {
                id: saved.id || targetId,
                email: saved.email || cached.email || '',
                role: saved.role || cached.role || 'TENANT',
                name: saved.fullName || name,
                phone: saved.phone || phone,
                username: saved.username || '',
                bio: saved.bio || '',
                avatarUrl: saved.avatarUrl || cached.avatarUrl || '',
                website: saved.website || '',
                gender: saved.gender || '',
                verified: saved.verified != null ? saved.verified : cached.verified
            }));
            showToast('Profile updated successfully!', 'success');
            setTimeout(() => { window.location.href = 'dashboard'; }, 350);
        } catch (error) {
            const msg = error.message || 'Failed to update profile.';
            showToast(msg, 'error');
            const l = msg.toLowerCase();
            let field = error.data && error.data.field;
            if (!field) {
                if (l.includes('phone')) field = 'phone';
                else if (l.includes('username') || l.includes('taken')) field = 'username';
                else if (l.includes('url') || l.includes('website')) field = 'website';
                else if (l.includes('gender')) field = 'gender';
                else if (l.includes('name')) field = 'fullName';
            }
            if (field && document.getElementById(field)) document.getElementById(field).focus();
        } finally {
            profileBusy(false);
        }
    });
/* ===== Avatar upload ===== */
    const avatarInput = document.getElementById('avatarInput');
    const avatarBtn = document.getElementById('avatarChangeBtn');
    if (avatarBtn) avatarBtn.addEventListener('click', () => avatarInput.click());
    if (avatarInput) avatarInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { showToast('Photo must be 5 MB or smaller.', 'error'); e.target.value = ''; return; }
        if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) { showToast('Please choose a PNG, JPG, WEBP or GIF image.', 'error'); e.target.value = ''; return; }
        const preview = URL.createObjectURL(file);
        avatarBtn.disabled = true;
        avatarBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading…';
        document.getElementById('profileAvatar').innerHTML = '<img src="' + preview + '" alt="avatar">';
        document.getElementById('avatarEditAvatar').innerHTML = '<img src="' + preview + '" alt="avatar">';
        try {
            let cached = api.getUser() || {}, targetId = cached.id;
            if (!targetId) {
                const me = await api.getMe();
                if (me && me.id) { targetId = me.id; cached = Object.assign({}, cached, me); }
                else throw new Error('Could not load your account.');
            }
            const res = await api.updateAvatar(targetId, file);
            if (!res || !res.avatarUrl) throw new Error('Upload completed but no photo URL was returned.');
            const url = api.resolveMedia(res.avatarUrl);
            document.getElementById('profileAvatar').innerHTML = '<img src="' + url + '" alt="avatar">';
            document.getElementById('avatarEditAvatar').innerHTML = '<img src="' + url + '" alt="avatar">';
            api.setUser(Object.assign({}, api.getUser(), { avatarUrl: res.avatarUrl }));
            showToast('Profile photo updated!', 'success');
        } catch (err) {
            showToast(err.message || 'Failed to upload photo.', 'error');
            const cached = api.getUser() || {}, url = api.resolveMedia(cached.avatarUrl || '');
            const initial = ((cached.name || cached.fullName || 'U').charAt(0)).toUpperCase();
            document.getElementById('profileAvatar').innerHTML = url ? '<img src="' + url + '" alt="avatar">' : initial;
            document.getElementById('avatarEditAvatar').innerHTML = url ? '<img src="' + url + '" alt="avatar">' : initial;
        } finally {
            URL.revokeObjectURL(preview);
            avatarBtn.disabled = false;
            avatarBtn.innerHTML = '<i class="fas fa-camera"></i> Upload Photo';
            e.target.value = '';
        }
    });
/* ===== Change password ===== */
    const passwordForm = document.getElementById('passwordForm');
    const pwdBtn = passwordForm.querySelector('button[type=submit]');
    const PWD = '<i class="fas fa-key"></i> Update Password';
    passwordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const current = document.getElementById('currentPassword').value;
        const newP = document.getElementById('newPassword').value;
        const confirmP = document.getElementById('confirmPassword').value;
        if (!current) { showToast('Please enter your current password.', 'error'); document.getElementById('currentPassword').focus(); return; }
        if (newP.length < 8 || !/[A-Za-z]/.test(newP) || !/[0-9]/.test(newP)) { showToast('Password must be at least 8 characters and contain letters and numbers.', 'error'); document.getElementById('newPassword').focus(); return; }
        if (newP !== confirmP) { showToast('New passwords do not match.', 'error'); document.getElementById('confirmPassword').focus(); return; }
        pwdBtn.disabled = true;
        pwdBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating…';
        try {
            let cached = api.getUser() || {}, targetId = cached.id;
            if (!targetId) {
                const me = await api.getMe();
                if (me && me.id) targetId = me.id;
                else throw new Error('Could not load your account.');
            }
            await api.updatePassword(targetId, newP, current);
            showToast('Password updated successfully!', 'success');
            passwordForm.reset();
        } catch (error) {
            showToast(error.message || 'Failed to update password.', 'error');
            if ((error.message || '').toLowerCase().includes('current password')) document.getElementById('currentPassword').focus();
        } finally {
            pwdBtn.disabled = false;
            pwdBtn.innerHTML = PWD;
        }
    });

    /* ===== Deactivate / delete ===== */
    const deactivateBtn = document.getElementById('deactivateBtn');
    const deleteBtn = document.getElementById('deleteBtn');
    if (deactivateBtn) deactivateBtn.addEventListener('click', async () => {
        if (!confirm('Deactivate your account? You will no longer be able to log in. Contact support to reactivate.')) return;
        deactivateBtn.disabled = true;
        deactivateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deactivating…';
        try {
            await api.deactivateAccount();
            showToast('Account deactivated.', 'success');
            setTimeout(() => api.logout(), 1200);
        } catch (e) {
            showToast(e.message || 'Failed to deactivate.', 'error');
            deactivateBtn.disabled = false;
            deactivateBtn.innerHTML = '<i class="fas fa-pause-circle"></i> Deactivate Account';
        }
    });
    if (deleteBtn) deleteBtn.addEventListener('click', async () => {
        if (!confirm('Delete your account PERMANENTLY? This removes all data and CANNOT be undone.')) return;
        if (!confirm('Final warning: this action is irreversible. Continue?')) return;
        deleteBtn.disabled = true;
        deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting…';
        try {
            await api.deleteAccount();
            showToast('Account permanently deleted.', 'success');
            setTimeout(() => api.logout(), 1200);
        } catch (e) {
            showToast(e.message || 'Failed to delete account.', 'error');
            deleteBtn.disabled = false;
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i> Delete Account Permanently';
        }
    });
})();
    (async () => { try { const me = await api.getMe(); if (me && me.id) applyProfile(me); } catch (e) { /* cache only */ } })();