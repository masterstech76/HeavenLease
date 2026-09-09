/* ============================================================
 * HeavenLease — Admin Dashboard module
 * Users / properties / owner-applications tables + integration
 * settings (Razorpay, SES, SNS, Google, reCAPTCHA).
 * Extracted from admin-dashboard.html.
 * Requires js/api.js + js/core.js loaded first.
 * ============================================================ */
(function () {
    'use strict';

    const navbar = document.getElementById('navbar');
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.getElementById('navLinks');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) navbar.classList.add('scrolled');
        else navbar.classList.remove('scrolled');
    });
    if (hamburger) hamburger.addEventListener('click', () => { hamburger.classList.toggle('active'); navLinks.classList.toggle('active'); });
    if (hamburger && navLinks) document.querySelectorAll('.nav-link').forEach(link => link.addEventListener('click', () => { hamburger.classList.remove('active'); navLinks.classList.remove('active'); }));

    function escapeHtml(str) {
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
        return String(str || '').replace(/[&<>"']/g, (m) => map[m]);
    }

    /* ===== Tabs ===== */
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById('panel-' + tab.dataset.tab).classList.add('active');
        });
    });

    /* ===== Badge ===== */
    function badge(status) {
        const s = (status || '').toLowerCase();
        const cls = (s === 'approved' || s === 'active' || s === 'verified') ? 'badge-approved'
            : (s === 'rejected' || s === 'inactive') ? 'badge-rejected' : 'badge-pending';
        return '<span class="badge ' + cls + '">' + escapeHtml(status) + '</span>';
    }

    /* ===== Users ===== */
    async function loadUsers() {
        try {
            const users = (await api.getUsers().catch(() => [])) || [];
            document.getElementById('statUsers').textContent = users.length || 0;
            const el = document.getElementById('usersList');
            if (!el) return;
            if (!users.length) { el.innerHTML = '<div class="empty-state"><i class="fas fa-users"></i><p>No users yet.</p></div>'; return; }
            el.innerHTML = '<table class="admin-table"><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead><tbody>'
                + users.map(u => '<tr>'
                    + '<td>' + escapeHtml(u.fullName || u.name || '-') + '</td>'
                    + '<td>' + escapeHtml(u.email || '-') + '</td>'
                    + '<td>' + escapeHtml(u.phone || '-') + '</td>'
                    + '<td>' + escapeHtml(u.role || '-') + '</td>'
                    + '<td>' + (u.verified ? '<span class="badge badge-approved">Verified</span>' : '<span class="badge badge-pending">Pending</span>') + '</td>'
                    + '<td>' + (u.verified ? '' : '<button class="admin-btn admin-btn-approve" onclick="verifyUser(' + u.id + ')"><i class="fas fa-check"></i> Verify</button>') + '</td>'
                    + '</tr>').join('')
                + '</tbody></table>';
        } catch (e) {
            const el = document.getElementById('usersList');
            if (el) el.innerHTML = '<div class="empty-state"><i class="fas fa-users"></i><p>Could not load users.</p></div>';
        }
    }
    window.verifyUser = async function (id) {
        try {
            await api.verifyUser(id);
            showToast('User verified successfully!', 'success');
            setTimeout(loadUsers, 500);
        } catch (e) { showToast((e && e.message) || 'Action failed.', 'error'); }
/* ===== Properties ===== */
    async function loadProperties() {
        try {
            const props = (await api.getProperties(0, 100).catch(() => [])) || [];
            document.getElementById('statProperties').textContent = props.length || 0;
            const el = document.getElementById('propertiesList');
            if (!el) return;
            if (!props.length) { el.innerHTML = '<div class="empty-state"><i class="fas fa-building"></i><p>No properties yet.</p></div>'; return; }
            el.innerHTML = '<table class="admin-table"><thead><tr><th>Title</th><th>Location</th><th>Rent</th><th>BHK</th><th>Status</th></tr></thead><tbody>'
                + props.map(p => '<tr>'
                    + '<td>' + escapeHtml(p.title || '-') + '</td>'
                    + '<td>' + escapeHtml(p.city || p.location || '-') + '</td>'
                    + '<td>' + (p.rentAmount ? '₹' + Number(p.rentAmount).toLocaleString('en-IN') : (p.price ? '₹' + Number(p.price).toLocaleString('en-IN') : '-')) + '</td>'
                    + '<td>' + escapeHtml(p.bhk || '-') + ' BHK</td>'
                    + '<td>' + badge(p.status || 'active') + '</td>'
                    + '</tr>').join('')
                + '</tbody></table>';
        } catch (e) {
            const el = document.getElementById('propertiesList');
            if (el) el.innerHTML = '<div class="empty-state"><i class="fas fa-building"></i><p>Could not load properties.</p></div>';
        }
    }

    /* ===== Owner applications ===== */
    async function loadOwnerApps() {
        try {
            const apps = (await api.getOwnerApplications().catch(() => [])) || [];
            document.getElementById('statOwnerApps').textContent = (apps || []).length || 0;
            const el = document.getElementById('ownersList');
            if (!el) return;
            if (!apps.length) { el.innerHTML = '<div class="empty-state"><i class="fas fa-file-shield"></i><p>No owner applications.</p></div>'; return; }
            el.innerHTML = '<table class="admin-table"><thead><tr><th>Name</th><th>Email</th><th>Property</th><th>Status</th><th>Actions</th></tr></thead><tbody>'
                + apps.map(a => '<tr>'
                    + '<td>' + escapeHtml(a.fullName || '-') + '</td>'
                    + '<td>' + escapeHtml(a.email || '-') + '</td>'
                    + '<td>' + escapeHtml(a.propertyAddress || '-') + '</td>'
                    + '<td>' + badge(a.status || 'pending') + '</td>'
                    + '<td>' + (a.status === 'approved' ? '<span class="badge badge-approved">Verified ✓</span>'
                        : a.status === 'rejected' ? '<span class="badge badge-rejected">Rejected</span>'
                            : '<button class="admin-btn admin-btn-approve" onclick="handleOwnerApp(' + a.id + ', \'approved\')"><i class="fas fa-check"></i> Approve</button>'
                                + '<button class="admin-btn admin-btn-reject" onclick="handleOwnerApp(' + a.id + ', \'rejected\')"><i class="fas fa-times"></i> Reject</button>') + '</td>'
                    + '</tr>').join('')
                + '</tbody></table>';
        } catch (e) {
            const el = document.getElementById('ownersList');
            if (el) el.innerHTML = '<div class="empty-state"><i class="fas fa-file-shield"></i><p>Could not load applications.</p></div>';
        }
    }
    window.handleOwnerApp = async function (id, status) {
        try {
            await api.updateOwnerApplicationStatus(id, status, 'Reviewed by admin');
            showToast('Application ' + status + '!', status === 'approved' ? 'success' : 'error');
            setTimeout(loadOwnerApps, 500);
        } catch (e) { showToast((e && e.message) || 'Action failed.', 'error'); }
    };
/* ===== Integration settings ===== */
    const INTEGRATION_GROUPS = [
        { id: 'razorpay', icon: 'fas fa-credit-card', iconCls: 'rzp', title: 'Razorpay Payments', desc: 'Accept UPI, cards & netbanking for access passes & escrow', fields: [
            { key: 'razorpay_key_id', label: 'Key ID', secret: false, placeholder: 'rzp_live_...', hint: 'From Razorpay Dashboard → Settings → API Keys' },
            { key: 'razorpay_key_secret', label: 'Key Secret', secret: true, placeholder: '••••••••', hint: 'Revealed only at creation. Store securely.' }
        ] },
        { id: 'ses', icon: 'fas fa-envelope', iconCls: 'ses', title: 'AWS SES — Email', desc: 'Send real email OTPs & notifications', fields: [
            { key: 'aws_ses_access_key', label: 'Access Key ID', secret: true, placeholder: 'AKIA...' },
            { key: 'aws_ses_secret_key', label: 'Secret Access Key', secret: true, placeholder: '••••••••' },
            { key: 'aws_ses_region', label: 'Region', secret: false, placeholder: 'ap-south-1' },
            { key: 'aws_ses_from_email', label: 'From Email', secret: false, placeholder: 'no-reply@heavenlease.in' }
        ] },
        { id: 'sns', icon: 'fas fa-sms', iconCls: 'sns', title: 'AWS SNS — SMS', desc: 'Send real SMS OTPs to phones', fields: [
            { key: 'aws_sns_access_key', label: 'Access Key ID', secret: true, placeholder: 'AKIA...' },
            { key: 'aws_sns_secret_key', label: 'Secret Access Key', secret: true, placeholder: '••••••••' },
            { key: 'aws_sns_region', label: 'Region', secret: false, placeholder: 'ap-south-1' },
            { key: 'aws_sns_sender_id', label: 'Sender ID', secret: false, placeholder: 'HEAVENLEASE' }
        ] },
        { id: 'google', icon: 'fab fa-google', iconCls: 'google', title: 'Google OAuth', desc: 'Sign in with Google', fields: [
            { key: 'google_client_id', label: 'Client ID', secret: false, placeholder: 'xxxx.apps.googleusercontent.com' },
            { key: 'google_client_secret', label: 'Client Secret', secret: true, placeholder: '••••••••' }
        ] },
        { id: 'recaptcha', icon: 'fas fa-shield-halved', iconCls: 'captcha', title: 'reCAPTCHA v3', desc: 'Bot protection on auth forms', fields: [
            { key: 'recaptcha_site_key', label: 'Site Key', secret: false, placeholder: '6Lc...' },
            { key: 'recaptcha_secret_key', label: 'Secret Key', secret: true, placeholder: '••••••••' }
        ] }
    ];

    let integrationStatus = {};
function renderIntegrationCards() {
        const grid = document.getElementById('intGrid');
        if (!grid) return;
        grid.innerHTML = INTEGRATION_GROUPS.map(group => {
            const fieldsHtml = group.fields.map(f => {
                const st = integrationStatus[f.key] || { isConfigured: false, maskedValue: '' };
                const maskedHtml = st.isConfigured
                    ? '<div class="int-masked">' + escapeHtml(st.maskedValue || '••••') + '</div>'
                    : '';
                return '<div class="int-field" data-key="' + f.key + '">'
                    + '<label>' + escapeHtml(f.label) + '</label>'
                    + '<input type="' + (f.secret ? 'password' : 'text') + '" placeholder="' + escapeHtml(f.placeholder || '') + '" value="">'
                    + maskedHtml
                    + '<small>' + escapeHtml(f.hint || '') + '</small></div>';
            }).join('');
            const isGroupLive = group.fields.some(f => integrationStatus[f.key] && integrationStatus[f.key].isConfigured);
            return '<div class="int-card" id="card-' + group.id + '">'
                + '<div class="int-card-head"><div class="int-icon ' + group.iconCls + '"><i class="' + group.icon + '"></i></div>'
                + '<div><strong>' + escapeHtml(group.title) + '</strong><p>' + escapeHtml(group.desc) + '</p></div>'
                + '<span class="int-status ' + (isGroupLive ? 'live' : 'not-configured') + '"><i class="fas ' + (isGroupLive ? 'fa-check-circle' : 'fa-circle-info') + '"></i> ' + (isGroupLive ? 'Live' : 'Not configured') + '</span>'
                + '</div>'
                + fieldsHtml
                + '<button class="int-save-btn" onclick="saveIntegrationGroup(\'' + group.id + '\')"><i class="fas fa-save"></i> Save</button>'
                + '<button class="int-remove-btn" onclick="removeIntegrationGroup(\'' + group.id + '\')" style="' + (isGroupLive ? '' : 'display: none;') + '"><i class="fas fa-trash"></i> Remove Saved Keys</button>'
                + '</div>';
        }).join('');
    }

    window.saveIntegrationGroup = async function (groupId) {
        const group = INTEGRATION_GROUPS.find(g => g.id === groupId);
        if (!group) return;
        const btn = document.querySelector('#card-' + groupId + ' .int-save-btn');
        const original = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        try {
            for (const f of group.fields) {
                const input = document.querySelector('#card-' + groupId + ' .int-field[data-key="' + f.key + '"] input');
                const value = input ? input.value.trim() : '';
                if (value) await api.saveIntegration(f.key, value);
            }
            showToast('Integration settings saved!', 'success');
            await loadIntegrations();
        } catch (e) {
            showToast(e.message || 'Failed to save integration.', 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = original;
        }
    };

    window.removeIntegrationGroup = async function (groupId) {
        const group = INTEGRATION_GROUPS.find(g => g.id === groupId);
        if (!group) return;
        if (!confirm('Remove saved credentials for ' + group.title + '? This cannot be undone.')) return;
        try {
            for (const f of group.fields) {
                await api.deleteIntegration(f.key).catch(() => { /* ignore */ });
            }
            showToast('Saved keys removed.', 'success');
            await loadIntegrations();
        } catch (e) {
            showToast(e.message || 'Failed to remove integration.', 'error');
        }
    };

    async function loadIntegrations() {
        try {
            const data = await api.getIntegrationStatus().catch(() => ({ integrations: [] }));
            integrationStatus = {};
            (data.integrations || []).forEach(item => { integrationStatus[item.key] = item; });
        } catch (e) {
            integrationStatus = {};
        }
        renderIntegrationCards();
    }

    /* ===== Initialize ===== */
    loadUsers();
    loadProperties();
    loadOwnerApps();
    loadIntegrations();
})();
    };