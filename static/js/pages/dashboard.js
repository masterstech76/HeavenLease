/* ============================================================
 * HeavenLease — Dashboard page module (js/pages/dashboard.js)
 * Restores the real, backend-driven dashboard into the new
 * static shell. Requires js/api.js + js/core.js loaded first.
 * ============================================================ */
(function () {
    'use strict';

    /* ===== Auth guard (api.js already auto-protects /dashboard) ===== */
    if (!window.api || typeof api.isAuthenticated !== 'function' || !api.isAuthenticated()) {
        window.location.replace('login?redirect=dashboard');
        return;
    }

    const user = api.getUser() || {};
    const role = (user.role || 'TENANT').toUpperCase();
    const uid = user.id || null;
    const isOwner = role === 'VERIFIED_OWNER' || role === 'OWNER';
    const isAdmin = role === 'ADMIN';

    const $ = (id) => document.getElementById(id);
    const setText = (id, txt) => { const el = $(id); if (el) el.textContent = txt == null ? '' : String(txt); };

    /* ===== Mobile sidebar toggle ===== */
    const dashSidebar = $('dashSidebar');
    const dashMobileToggle = $('dashMobileToggle');
    if (dashSidebar && dashMobileToggle) {
        dashMobileToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            dashSidebar.classList.toggle('open');
        });
        document.addEventListener('click', (e) => {
            if (!dashSidebar.contains(e.target) && !dashMobileToggle.contains(e.target)) {
                dashSidebar.classList.remove('open');
            }
        });
        document.querySelectorAll('.dash-nav-item').forEach((item) => {
            item.addEventListener('click', () => {
                document.querySelectorAll('.dash-nav-item').forEach((i) => i.classList.remove('active'));
                item.classList.add('active');
                dashSidebar.classList.remove('open');
            });
        });
    }

    /* ===== Header greeting (from cache, refreshed by /me below) ===== */
    const name = user.name || user.fullName || user.email || '';
    setText('dashUserName', name || 'Signed in');
    setText('dashUserRole', isAdmin ? 'Administrator' : (isOwner ? 'Property Owner' : 'Tenant'));
    setText('dashWelcome', 'Welcome back, ' + (name ? name.split(' ')[0] : 'there') + '! 👋');
    setText('dashSubtitle', isAdmin ? 'Manage the platform from here.'
        : (isOwner ? "Here's what's happening with your listings, tours and leases."
            : 'Find your perfect home, track applications and manage your rentals.'));

    /* ===== Role-aware header buttons ===== */
    const btnAdd = $('btnAddProperty');
    const btnBrowse = $('btnBrowse');
    if (btnAdd) btnAdd.style.display = isOwner || isAdmin ? '' : 'none';
    if (btnBrowse) btnBrowse.style.display = isOwner || isAdmin ? 'none' : '';
    if (btnBrowse) btnBrowse.href = 'properties';
    const navRc = $('navRentCollection');
    if (navRc) navRc.style.display = isOwner || isAdmin ? '' : 'none';
    const navMine = $('navMyProperties');
    if (navMine) navMine.setAttribute('href', isOwner || isAdmin ? 'properties-management' : 'properties');
    const docAll = $('docViewAllLink');
    if (docAll) docAll.setAttribute('href', isOwner || isAdmin ? 'owner-verify' : 'verify-account');
/* ===== Profile card ===== */
    function populateProfile(u) {
        if (!u) return;
        const nm = u.name || u.fullName || u.email || 'User';
        setText('dashProfileName', nm);
        setText('dashProfileUsername', u.username ? '@' + u.username : '');
        const bio = u.bio || (isOwner ? 'Property owner on HeavenLease — verified homes, no brokers.' : 'Tenant on HeavenLease.');
        setText('dashProfileBio', bio);
        setText('dashProfileEmail', u.email || '');
        setText('dashProfilePhone', u.phone || '');
        setText('dashProfileGender', u.gender ? u.gender.charAt(0).toUpperCase() + u.gender.slice(1) : '');
        const webWrap = $('dashProfileWebsiteWrap');
        const web = $('dashProfileWebsite');
        if (web) {
            if (u.website) { web.textContent = u.website.replace(/^https?:\/\//, ''); web.href = u.website; if (webWrap) webWrap.style.display = ''; }
            else if (webWrap) webWrap.style.display = 'none';
        }
        const avatar = $('dashProfileAvatar');
        if (avatar) {
            if (u.avatarUrl) { avatar.innerHTML = '<img src="' + api.escapeHtml(u.avatarUrl) + '" alt="avatar">'; }
            else avatar.textContent = (u.name || u.fullName || 'U').charAt(0).toUpperCase();
        }
        const editBtn = $('dashEditProfileBtn');
        if (editBtn) editBtn.setAttribute('href', 'edit-profile');
        const badge = $('dashProfileBadge');
        if (badge) {
            if (u.verified) { badge.className = 'verified-badge'; badge.innerHTML = '<i class="fas fa-check-circle"></i> Verified'; }
            else { badge.className = 'unverified-badge'; badge.innerHTML = '<i class="fas fa-clock"></i> Not Verified'; }
            badge.style.display = 'inline-flex';
        }
    }
    populateProfile(api.getUser());

    // Merge the server /me response into local cache (never wipe known fields).
    (async () => {
        try {
            const me = await api.getMe();
            if (me && me.id) {
                const st = api.getUser() || {};
                const merged = Object.assign({}, st, {
                    id: me.id, email: me.email || st.email || '', role: me.role || 'TENANT',
                    name: me.fullName || me.name || st.name || '', phone: me.phone || st.phone || '',
                    username: me.username || st.username || '', bio: me.bio || st.bio || '',
                    avatarUrl: me.avatarUrl || st.avatarUrl || '', website: me.website || st.website || '',
                    gender: me.gender || st.gender || '', verified: me.verified
                });
                api.setUser(merged);
                populateProfile(merged);
            }
        } catch (e) { /* profile already filled from cache */ }
    })();
/* ===== Quick actions ===== */
    const qa = $('quickActions');
    const quickActions = (title, href, icon, locked) =>
        '<div class="activity-item" style="border:none;padding:10px 0;border-bottom:1px solid var(--gray-100);">'
        + (locked
            ? '<a href="payment" style="color:var(--primary);font-weight:500;"><i class="fas fa-lock"></i> ' + title + ' — Unlock with Access Pass</a>'
            : '<a href="' + href + '" style="color:var(--dark);font-weight:500;"><i class="' + icon + '"></i> ' + title + '</a>')
        + '</div>';
    if (qa) {
        if (isOwner || isAdmin) {
            qa.innerHTML = quickActions('Main Home', 'home', 'fas fa-home')
                + quickActions('List a Property', 'list-property', 'fas fa-plus')
                + quickActions('Manage Properties', 'properties-management', 'fas fa-house-circle-check')
                + quickActions('Manage Leases', 'lease-management', 'fas fa-file-contract')
                + quickActions('Maintenance', 'maintenance-requests', 'fas fa-toolbox')
                + quickActions('Rent Collection', 'rent-collection', 'fas fa-hand-holding-dollar')
                + quickActions('Payments', 'payment', 'fas fa-credit-card')
                + quickActions('Messages', 'messages', 'fas fa-comments');
        } else {
            qa.innerHTML = quickActions('Browse Properties', 'properties', 'fas fa-building')
                + quickActions('Rental Application', 'rental-application', 'fas fa-file-signature')
                + quickActions('Application Status', 'application-status', 'fas fa-hourglass-half')
                + quickActions('Book a Tour', 'tour-booking', 'fas fa-calendar-check', true)
                + quickActions('Documents', 'documents', 'fas fa-folder-tree')
                + quickActions('Maintenance Request', 'maintenance-request', 'fas fa-screwdriver-wrench')
                + quickActions('Access Pass', 'payment', 'fas fa-credit-card')
                + quickActions('Messages', 'messages', 'fas fa-comments');
        }
    }
/* ===== Feature hub ===== */
    const hub = $('dashFeatureHub');
    const hubCard = (icon, cls, title, desc, href, locked) =>
        '<a href="' + href + '" style="text-decoration:none;color:inherit;">'
        + '<div class="dash-stat-card" style="cursor:pointer;">'
        + '<div class="dash-stat-icon ' + cls + '"><i class="' + icon + '"></i></div>'
        + '<span class="dash-stat-value" style="font-size:16px;">' + title + '</span>'
        + '<span class="dash-stat-label">' + desc + '</span>'
        + (locked ? '<span class="dash-stat-change" style="color:#B45309;display:inline-flex;margin-top:8px;"><i class="fas fa-lock"></i> Premium</span>' : '')
        + '</div></a>';
    if (hub) {
        if (isOwner || isAdmin) {
            hub.innerHTML = hubCard('fa-plus', 'green', 'List Property', 'Add a new listing', 'list-property')
                + hubCard('fa-building', 'blue', 'My Properties', 'Manage your listings', 'properties-management')
                + hubCard('fa-calendar-check', 'orange', 'Tour Requests', 'View & approve tours', 'tour-booking')
                + hubCard('fa-file-signature', 'purple', 'Leases', 'Create & sign leases', 'lease-signing');
        } else {
            hub.innerHTML = hubCard('fa-building', 'blue', 'Browse Homes', 'Search verified rentals', 'properties')
                + hubCard('fa-calendar-check', 'orange', 'Book a Tour', 'Request a property tour', 'tour-booking', true)
                + hubCard('fa-file-signature', 'purple', 'Lease a Home', 'Sign a rental lease', 'lease-signing', true)
                + hubCard('fa-credit-card', 'green', 'Access Pass', 'Unlock contacts & book', 'payment');
        }
    }
/* ===== Stats + recent activity ===== */
    (async () => {
        const body = $('recentListBody');
        const titleEl = $('recentListTitle');
        try {
            let props = [], tours = [], leases = [], sub = null;
            if (uid) {
                if (isOwner || isAdmin) {
                    props = (await api.getPropertiesByOwner(uid).catch(() => [])) || [];
                    tours = (await api.getBookingsByOwner(uid).catch(() => [])) || [];
                    leases = (await api.getLeasesByOwner(uid).catch(() => [])) || [];
                } else {
                    tours = (await api.getBookingsByTenant(uid).catch(() => [])) || [];
                    leases = (await api.getLeasesByTenant(uid).catch(() => [])) || [];
                }
            }
            sub = (await api.getSubscription().catch(() => null)) || null;

            const setVal = (id, v) => { const el = $(id); if (el) el.textContent = v; };
            if (isOwner || isAdmin) {
                setVal('statPropertiesLabel', 'My Properties');
                setVal('statProperties', props.length);
                setVal('statTours', tours.length);
                setVal('statLeases', leases.length);
                setVal('statSubscription', sub && sub.active ? 'Active' : '—');
            } else {
                setVal('statPropertiesLabel', 'Subscribed');
                setVal('statProperties', sub && sub.active ? 'Yes' : 'No');
                setVal('statTours', tours.length);
                setVal('statLeases', leases.length);
                setVal('statSubscription', sub && sub.active ? 'Active' : 'Inactive');
            }

            if (titleEl) titleEl.textContent = (isOwner || isAdmin) && props.length ? 'My Properties' : 'Your Tour Requests';
            if (!(isOwner || isAdmin) || !props.length) setText('col1', 'Property'), setText('col2', 'Date'), setText('col3', 'Status');
            else setText('col1', 'Title'), setText('col2', 'City / Rent'), setText('col3', 'Status');

            if (body) {
                if ((isOwner || isAdmin) && props.length) {
                    body.innerHTML = props.slice(0, 5).map((p) =>
                        '<tr><td>' + api.escapeHtml(p.title || '—') + '</td><td>'
                        + api.escapeHtml((p.city || '') + ' · ₹' + (p.rentAmount == null ? '—' : p.rentAmount))
                        + '</td><td><span class="status status-active">' + api.escapeHtml(p.status || 'active') + '</span></td></tr>'
                    ).join('');
                } else {
                    body.innerHTML = tours.length ? tours.slice(0, 5).map((t) =>
                        '<tr><td>' + api.escapeHtml(t.propertyTitle || ('#' + (t.propertyId || '—'))) + '</td><td>'
                        + api.escapeHtml(t.tourDate || '—') + '</td><td><span class="status status-active">'
                        + api.escapeHtml(t.status || 'pending') + '</span></td></tr>'
                    ).join('') : '<tr><td colspan="3" style="text-align:center;color:var(--gray-400);padding:24px;">No tours yet. Browse properties to request one.</td></tr>';
                }
            }
        } catch (e) {
            if (body) body.innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--gray-400);padding:24px;">Could not load data.</td></tr>';
        }
    })();

    /* ===== Verification & Documents summary ===== */
    (async () => {
        const summaryEl = $('dashDocSummary');
        if (!summaryEl) return;
        try {
            const isOwnerRole = isOwner || isAdmin;
            const docs = isOwnerRole ? (await api.getReceivedDocuments().catch(() => [])) : (await api.getMyDocuments().catch(() => []));
            if (!docs || !docs.length) {
                summaryEl.innerHTML = '<div class="activity-item" style="border:none;padding:10px 0;color:var(--gray-400);">No documents yet. Go to any <a href="verify-account" style="color:var(--primary);">Verification page</a> to upload or review documents.</div>';
                return;
            }
            const pending = docs.filter((d) => (d.status || 'PENDING').toUpperCase() === 'PENDING').length;
            const verified = docs.filter((d) => (d.status || '').toUpperCase() === 'VERIFIED').length;
            const rejected = docs.filter((d) => (d.status || '').toUpperCase() === 'REJECTED').length;
            summaryEl.innerHTML =
                '<div class="activity-item" style="border:none;padding:10px 0;border-bottom:1px solid var(--gray-100);"><a href="verify-account" style="color:var(--dark);font-weight:500;"><i class="fas fa-clock"></i> Pending review — ' + pending + '</a></div>'
                + '<div class="activity-item" style="border:none;padding:10px 0;border-bottom:1px solid var(--gray-100);"><a href="verify-account" style="color:var(--dark);font-weight:500;"><i class="fas fa-check-circle"></i> Verified — ' + verified + '</a></div>'
                + '<div class="activity-item" style="border:none;padding:10px 0;"><a href="verify-account" style="color:var(--dark);font-weight:500;"><i class="fas fa-xmark-circle"></i> Rejected — ' + rejected + '</a></div>'
                + '<div class="activity-item" style="border:none;padding:6px 0;"><a href="verify-account" style="color:var(--primary);font-size:13px;">Open Verification pages →</a></div>';
        } catch (e) {
            summaryEl.innerHTML = '<div class="activity-item" style="border:none;padding:10px 0;color:var(--gray-400);">Could not load documents.</div>';
        }
    })();
})();