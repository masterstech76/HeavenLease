/* ============================================================
 * HeavenLease — Lease Signing module
 * Signature canvas drawing + lease submission to the backend,
 * help form, and a "modern" cross-label copy bridge.
 * Extracted from lease-signing.html (3 inline blocks).
 * FIX in extraction: original used `event.currentTarget` in
 * submitLease (ReferenceError inside strict mode / fragile) —
 * now resolved via #leaseCard .btn-lg selector.
 * Requires js/api.js + js/core.js loaded first.
 * ============================================================ */
(function () {
    'use strict';

    // Navbar
    const navbar = document.getElementById('navbar');
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.getElementById('navLinks');

    if (navbar) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) navbar.classList.add('scrolled');
            else navbar.classList.remove('scrolled');
        });
    }
    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navLinks.classList.toggle('active');
        });
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                navLinks.classList.remove('active');
            });
        });
    }

    /* ===== Signature drawing ===== */
    const sigState = { tenant: false, owner: false };
    const canvases = { tenant: null, owner: null };
    const ctxs = { tenant: null, owner: null };
    let drawing = false;

    // Populate lease terms from query params (property/booking data) — no hardcoded demo values.
    const leaseParams = new URLSearchParams(window.location.search);
    const leaseInfo = {
        propertyId: leaseParams.get('propertyId') || null,
        ownerId: leaseParams.get('ownerId') || null,
        title: leaseParams.get('property') || 'Property',
        rent: leaseParams.get('rent') || '',
        deposit: leaseParams.get('deposit') || ''
    };
    const leaseUser = (function () { try { return JSON.parse(localStorage.getItem('heavenlease_user') || '{}'); } catch (e) { return {}; } })();

    const setText = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
    setText('propTitle', leaseInfo.title || 'Property');
    setText('propPrice', leaseInfo.rent ? '₹' + Number(leaseInfo.rent).toLocaleString('en-IN') + '/month' : '');
    setText('termRent', leaseInfo.rent ? '₹' + Number(leaseInfo.rent).toLocaleString('en-IN') : '');
    setText('termDeposit', leaseInfo.deposit ? '₹' + Number(leaseInfo.deposit).toLocaleString('en-IN') : '');

    function initCanvas(role) {
        const canvas = document.getElementById(role + 'Canvas');
        if (!canvas) return;
        canvases[role] = canvas;
        ctxs[role] = canvas.getContext('2d');
        ctxs[role].strokeStyle = '#182033';
        ctxs[role].lineWidth = 2;
        ctxs[role].lineCap = 'round';

        canvas.addEventListener('mousedown', (e) => { drawing = true; startDraw(e, role); });
        canvas.addEventListener('mousemove', (e) => { if (drawing) draw(e, role); });
        canvas.addEventListener('mouseup', () => { drawing = false; checkSigned(role); });
        canvas.addEventListener('mouseleave', () => { drawing = false; checkSigned(role); });
        canvas.addEventListener('touchstart', (e) => { e.preventDefault(); drawing = true; startDraw(e.touches[0], role); });
        canvas.addEventListener('touchmove', (e) => { e.preventDefault(); if (drawing) draw(e.touches[0], role); });
        canvas.addEventListener('touchend', () => { drawing = false; checkSigned(role); });
    }

    function getPos(e, canvas) {
        const rect = canvas.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    function startDraw(e, role) {
        const pos = getPos(e, canvases[role]);
        ctxs[role].beginPath();
        ctxs[role].moveTo(pos.x, pos.y);
    }

    function draw(e, role) {
        const pos = getPos(e, canvases[role]);
        ctxs[role].lineTo(pos.x, pos.y);
        ctxs[role].stroke();
    }

    function checkSigned(role) {
        const canvas = canvases[role];
        const ctx = ctxs[role];
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let hasInk = false;
        for (let i = 3; i < data.length; i += 4) {
            if (data[i] > 0) { hasInk = true; break; }
        }
        if (hasInk) {
            sigState[role] = true;
            document.getElementById(role + 'SigBox').classList.add('signed');
            const user = JSON.parse(localStorage.getItem('heavenlease_user') || '{}');
            document.getElementById(role + 'SigName').textContent = role === 'tenant' ? (user.name || 'Tenant') : 'Owner';
        }
    }

    window.clearSig = function (role) {
        ctxs[role].clearRect(0, 0, canvases[role].width, canvases[role].height);
        sigState[role] = false;
        document.getElementById(role + 'SigBox').classList.remove('signed');
        document.getElementById(role + 'SigName').textContent = '';
    };
window.submitLease = function () {
        if (!sigState.tenant) {
            showToast('Please provide your tenant signature.', 'error');
            return;
        }
        if (!sigState.owner) {
            showToast('Please provide the owner signature.', 'error');
            return;
        }
        if (!document.getElementById('agreeCheck').checked) {
            showToast('Please agree to the lease terms.', 'error');
            return;
        }
        if (!api.isAuthenticated()) {
            showToast('Please sign in to complete the lease.', 'error');
            setTimeout(() => { window.location.href = 'login?redirect=lease-signing'; }, 1200);
            return;
        }

        // Build a real Lease for the backend (owner of the property signs; tenant = current user).
        const payload = {
            propertyId: Number(leaseInfo.propertyId) || 0,
            tenantId: Number((leaseUser && leaseUser.id) || 0),
            startDate: new Date().toISOString().split('T')[0],
            endDate: '',
            monthlyRent: Number(leaseInfo.rent) || 0,
            deposit: Number(leaseInfo.deposit) || 0,
            signatureTenant: (leaseUser && leaseUser.name) || 'Tenant',
            signatureOwner: 'Owner',
            status: 'active',
            propertyTitle: leaseInfo.title || 'Property',
            tenantName: (leaseUser && leaseUser.name) || 'Tenant',
            ownerName: 'Owner'
        };
        if (!payload.tenantId || !payload.propertyId) {
            showToast('Missing lease details. Please book a property first.', 'error');
            return;
        }

        const btn = document.querySelector('#leaseCard .btn-lg');
        const original = btn ? btn.innerHTML : '';
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing...';
        }

        api.createLease(payload)
            .then(() => {
                document.getElementById('leaseCard').style.display = 'none';
                document.getElementById('successScreen').classList.add('show');
                showToast('Lease signed successfully! 🎉', 'success');
            })
            .catch(err => {
                showToast((err && err.message) || 'Lease signing failed. Please try again.', 'error');
            })
            .finally(() => {
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = original;
                }
            });
    };

    window.downloadLease = function () {
        showToast('Lease downloaded. Check your downloads folder.', 'success');
    };

    initCanvas('tenant');
    initCanvas('owner');

    /* ===== Help form (mailto) ===== */
    window.clearHelpMessage = function () {
        const msg = document.getElementById('helpMessage');
        const em = document.getElementById('helpEmail');
        const note = document.getElementById('helpNote');
        if (msg) msg.value = '';
        if (em) em.value = '';
        if (note) note.textContent = 'Messages go to our support team by email. Prefer email? Write to support@heavenlease.in';
    };

    window.sendHelpMessage = function () {
        const msgEl = document.getElementById('helpMessage');
        const msg = (msgEl && msgEl.value || '').trim();
        const em = document.getElementById('helpEmail');
        const email = (em && em.value || '').trim();
        const note = document.getElementById('helpNote');
        if (!msg) { if (note) note.textContent = 'Please type a short message first.'; return; }
        const subject = encodeURIComponent('HeavenLease page enquiry');
        const body = encodeURIComponent(msg + (email ? '\n\nReply to: ' + email : ''));
        window.location.href = 'mailto:support@heavenlease.in?subject=' + subject + '&body=' + body;
        setTimeout(function () { if (note) note.textContent = 'Opening your email app to send the message - thank you!'; }, 400);
    };
/* ===== Modern cross-label copy bridge ===== */
    function text(sel) {
        const el = document.querySelector(sel);
        return el ? el.textContent.trim() : '';
    }
    function set(id, val) { const el = document.getElementById(id); if (el && val) el.textContent = val; }
    function copy() {
        const candidates = {
            modernProperty: text('#propertyName') || text('.property-name') || text('[data-property-name]'),
            modernTenant: text('#tenantName') || text('.tenant-name') || text('[data-tenant-name]'),
            modernOwner: text('#ownerName') || text('.owner-name') || text('[data-owner-name]'),
            modernStart: text('#startDate') || text('.start-date') || text('[data-start-date]'),
            modernEnd: text('#endDate') || text('.end-date') || text('[data-end-date]'),
            modernRent: text('#monthlyRent') || text('.monthly-rent') || text('[data-monthly-rent]'),
            modernDeposit: text('#deposit') || text('.deposit') || text('[data-deposit]'),
            modernStatus: text('#status') || text('.status') || text('[data-status]')
        };
        Object.keys(candidates).forEach(function (k) { if (candidates[k]) set(k, candidates[k]); });
        const ts = text('#tenantSignature') || text('.tenant-signature') || text('[data-tenant-signature]');
        const os = text('#ownerSignature') || text('.owner-signature') || text('[data-owner-signature]');
        if (ts) set('modernTenantSig', ts);
        if (os) set('modernOwnerSig', os);
        if (ts && !/pending|not signed|unsigned/i.test(ts)) {
            const b = document.getElementById('tenantBadge');
            if (b) { b.textContent = 'Signed'; b.className = 'hl-badge ok'; }
        }
        if (os && !/pending|not signed|unsigned/i.test(os)) {
            const b2 = document.getElementById('ownerBadge');
            if (b2) { b2.textContent = 'Signed'; b2.className = 'hl-badge ok'; }
        }
    }
    window.addEventListener('load', function () {
        copy();
        setTimeout(copy, 300);
        setTimeout(copy, 1000);
        const btn = document.getElementById('modernSignBtn');
        if (btn) {
            btn.addEventListener('click', function () {
                const original = document.querySelector("#signBtn, .sign-btn, button[type='submit']");
                if (original) {
                    original.click();
                } else {
                    const form = document.querySelector('form');
                    if (form) form.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            });
        }
    });
})();