class HeavenLeaseAPI {
    constructor() {
        this.baseUrl = this.getBaseUrl();
        this.tokenKey = 'heavenlease_token';
        this.userKey = 'heavenlease_user';
    }

    getBaseUrl() {
        if (window.API_BASE_URL) return window.API_BASE_URL;
        return '';
    }

    getToken() {
        return localStorage.getItem(this.tokenKey) || sessionStorage.getItem(this.tokenKey);
    }

    setToken(token, remember = true) {
        // Clear both storages first to avoid conflicts
        localStorage.removeItem(this.tokenKey);
        sessionStorage.removeItem(this.tokenKey);
        if (token) {
            const store = remember ? localStorage : sessionStorage;
            store.setItem(this.tokenKey, token);
        }
    }

    getUser() {
        try {
            const raw = localStorage.getItem(this.userKey) || sessionStorage.getItem(this.userKey);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    }

    setUser(user, remember = true) {
        // Clear both storages first to avoid conflicts
        localStorage.removeItem(this.userKey);
        sessionStorage.removeItem(this.userKey);
        if (user) {
            const store = remember ? localStorage : sessionStorage;
            store.setItem(this.userKey, JSON.stringify(user));
        }
    }

    isAuthenticated() {
        return !!this.getToken();
    }

    logout() {
        this.setToken(null);
        this.setUser(null);
        window.location.href = 'login';
    }

    async request(method, path, body = null, isFormData = false) {
        const headers = {};
        const token = this.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        let requestBody = body;
        if (body && !isFormData) {
            headers['Content-Type'] = 'application/json';
            requestBody = JSON.stringify(body);
        }

        try {
            const response = await fetch(`${this.baseUrl}${path}`, {
                method,
                headers,
                body: requestBody ? requestBody : undefined
            });

            // Handle auth failures — redirect to login. 401 is returned by the backend
            // for missing/invalid/expired tokens; 403 is also treated as a session
            // failure on the account/profile endpoints so a stale session never leaves
            // profile/save flows silently broken.
            if (response.status === 401) {
                this.logout();
                throw new Error('Session expired. Please login again.');
            }
            if (response.status === 403
                    && (path === '/api/auth/me' || path.startsWith('/api/users'))) {
                this.logout();
                throw new Error('Session expired. Please login again.');
            }

            const contentType = response.headers.get('content-type');
            const data = contentType && contentType.includes('application/json')
                ? await response.json()
                : await response.text();

            if (!response.ok) {
                const error = new Error(data.message || data.error || `API Error: ${response.status}`);
                error.status = response.status;
                error.data = data;
                throw error;
            }

            return data;
        } catch (error) {
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('Network error: Cannot connect to server. Is the backend running?');
            }
            throw error;
        }
    }

    // ===== AUTH =====
    async login(email, password, captchaToken, remember = true) {
        const body = { email, password };
        if (captchaToken) body.captchaToken = captchaToken;
        const data = await this.request('POST', '/api/auth/login', body);
        this.setToken(data.token, remember);
        this.setUser({ email: data.email, role: data.role, name: data.fullName || data.name || '', id: data.id }, remember);
        return data;
    }

    // Phone-based login (email + OTP after phone verification)
    async phoneLogin(phone, password, captchaToken, remember = true) {
        const body = { phone, password };
        if (captchaToken) body.captchaToken = captchaToken;
        const data = await this.request('POST', '/api/auth/phone-login', body);
        this.setToken(data.token, remember);
        this.setUser({ email: data.email, role: data.role, name: data.fullName || data.name || '', id: data.id }, remember);
        return data;
    }

    async sendVerification(email) {
        return this.request('POST', '/api/auth/send-verification', { email });
    }

    async sendSignupCode(email) {
        return this.request('POST', '/api/auth/send-signup-code', { email });
    }

    async verifyEmail(email, code) {
        return this.request('POST', '/api/auth/verify-email', { email, code });
    }

    async sendSmsOtp(phone) {
        return this.request('POST', '/api/auth/send-sms-otp', { phone });
    }

    async verifySmsOtp(phone, code) {
        return this.request('POST', '/api/auth/verify-sms-otp', { phone, code });
    }

    async loginWithEmailOtp(email, code, remember = true) {
        const data = await this.request('POST', '/api/auth/email-otp-login', { email, code });
        this.setToken(data.token, remember);
        this.setUser({ email: data.email, role: data.role, name: data.fullName || data.name || '', id: data.id }, remember);
        return data;
    }

    async loginWithPhoneOtp(phone, code, remember = true) {
        const data = await this.request('POST', '/api/auth/phone-otp-login', { phone, code });
        this.setToken(data.token, remember);
        this.setUser({ email: data.email, role: data.role, name: data.fullName || data.name || '', id: data.id }, remember);
        return data;
    }

    async verifyCaptcha(captchaToken) {
        return this.request('POST', '/api/auth/verify-captcha', { captchaToken });
    }

    // ===== PASSWORD RESET (secure flow) =====
    async forgotPassword(email) {
        return this.request('POST', '/api/auth/forgot-password', { email });
    }

    async verifyResetOtp(email, code) {
        return this.request('POST', '/api/auth/verify-reset-otp', { email, code });
    }

    async resetPassword(email, resetToken, newPassword) {
        return this.request('POST', '/api/auth/reset-password', { email, resetToken, newPassword });
    }

    async signup(userData) {
        const data = await this.request('POST', '/api/auth/signup', userData);
        const remember = userData.remember !== false;
        this.setToken(data.token, remember);
        this.setUser({ email: data.email, role: data.role, name: data.fullName || data.name || '', id: data.id }, remember);
        return data;
    }

    async googleLogin(idToken, remember = true, role) {
        const body = { idToken };
        if (role) body.role = role;
        const data = await this.request('POST', '/api/auth/google', body);
        this.setToken(data.token, remember);
        this.setUser({ email: data.email, role: data.role, name: data.fullName || data.name || '', id: data.id }, remember);
        return data;
    }

    async getMe() {
        return this.request('GET', '/api/auth/me');
    }

    // ===== PROPERTIES =====
    async getProperties(page = 0, size = 20) {
        const data = await this.request('GET', `/api/properties?page=${page}&size=${size}`);
        // Backend returns a Spring Page object - extract the content array
        return Array.isArray(data) ? data : (data.content || []);
    }

    async searchProperties(filters = {}) {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                params.append(key, value);
            }
        });
        const query = params.toString();
        const data = await this.request('GET', `/api/properties/search${query ? `?${query}` : ''}`);
        // Backend returns a Spring Page object - extract the content array
        return Array.isArray(data) ? data : (data.content || []);
    }

    async getProperty(id) {
        return this.request('GET', `/api/properties/${id}`);
    }

    async createProperty(property) {
        return this.request('POST', '/api/properties', property);
    }

    async updateProperty(id, property) {
        return this.request('PUT', `/api/properties/${id}`, property);
    }

    async deleteProperty(id) {
        return this.request('DELETE', `/api/properties/${id}`);
    }

    async getPropertiesByOwner(ownerId) {
        return this.request('GET', `/api/properties/owner/${ownerId}`);
    }

    async addPropertyPhoto(id, photoUrl) {
        return this.request('POST', `/api/properties/${id}/photos`, { photoUrl });
    }

    async removePropertyPhoto(id, photoUrl) {
        return this.request('DELETE', `/api/properties/${id}/photos`, { photoUrl });
    }

    // ===== BOOKINGS =====
    async getBookings() {
        return this.request('GET', '/api/bookings');
    }

    async getBooking(id) {
        return this.request('GET', `/api/bookings/${id}`);
    }

    async createBooking(booking) {
        return this.request('POST', '/api/bookings', booking);
    }

    async updateBookingStatus(id, status) {
        return this.request('PUT', `/api/bookings/${id}/status`, { status });
    }

    async getBookingsByProperty(propertyId) {
        return this.request('GET', `/api/bookings/property/${propertyId}`);
    }

    async getBookingsByTenant(tenantId) {
        return this.request('GET', `/api/bookings/tenant/${tenantId}`);
    }

    async getBookingsByOwner(ownerId) {
        return this.request('GET', `/api/bookings/owner/${ownerId}`);
    }

    // ===== USERS =====
    async getUsers() {
        return this.request('GET', '/api/users');
    }

    async getUserById(id) {
        return this.request('GET', `/api/users/${id}`);
    }

    async updateUser(id, user) {
        return this.request('PUT', `/api/users/${id}`, user);
    }

    async updateAvatar(id, file) {
        const formData = new FormData();
        formData.append('file', file);
        return this.request('POST', `/api/users/${id}/avatar`, formData, true);
    }

    async updatePassword(id, password) {
        return this.request('PATCH', `/api/users/${id}/password`, { password });
    }

    async verifyUser(id) {
        return this.request('PUT', `/api/users/${id}/verify`);
    }

    // ===== LEASES =====
    async getLeases() {
        return this.request('GET', '/api/leases');
    }

    async getLease(id) {
        return this.request('GET', `/api/leases/${id}`);
    }

    async createLease(lease) {
        return this.request('POST', '/api/leases', lease);
    }

    async updateLease(id, lease) {
        return this.request('PUT', `/api/leases/${id}`, lease);
    }

    async updateLeaseStatus(id, status) {
        return this.request('PUT', `/api/leases/${id}/status`, { status });
    }

    async getLeasesByTenant(tenantId) {
        return this.request('GET', `/api/leases/tenant/${tenantId}`);
    }

    async getLeasesByOwner(ownerId) {
        return this.request('GET', `/api/leases/owner/${ownerId}`);
    }

    // ===== MESSAGES =====
    async getMessages() {
        return this.request('GET', '/api/messages');
    }

    async getConversation(conversationId) {
        return this.request('GET', `/api/messages/conversation/${conversationId}`);
    }

    async getMyConversations() {
        return this.request('GET', '/api/messages/mine');
    }

    async sendMessage(message) {
        return this.request('POST', '/api/messages', message);
    }

    async markMessageRead(id) {
        return this.request('PUT', `/api/messages/${id}/read`);
    }

    // Returns the authenticated user's subscription state from the payments
    // table: { active, planMonths?, expiresAt?, amount?, transactionId?, paymentType? }.
    // This is the single source of truth — never localStorage.
    async getSubscription() {
        return this.request('GET', '/api/payments/subscription');
    }

    async getPaymentConfig() {
        return this.request('GET', '/api/payments/config');
    }

    async createRazorpayOrder(planMonths, receipt, purpose = 'subscription') {
        return this.request('POST', '/api/payments/create-order', { planMonths, receipt, purpose });
    }

    async verifyRazorpayPayment(payload) {
        return this.request('POST', '/api/payments/verify-payment', payload);
    }

    async initiateEscrow(amount, propertyId, tenantId, ownerId) {
        return this.request('POST', '/api/payments/escrow', { amount, propertyId, tenantId, ownerId });
    }

    async getMyEscrows() {
        return this.request('GET', '/api/payments/escrow/mine');
    }

    async holdEscrow(id) {
        return this.request('POST', `/api/payments/escrow/${id}/hold`);
    }

    async releaseEscrow(id, party) {
        return this.request('POST', `/api/payments/escrow/${id}/release/${party}`);
    }

    async disputeEscrow(id, reason) {
        return this.request('POST', `/api/payments/escrow/${id}/dispute`, { reason });
    }

    async resolveEscrow(id, resolutionNote) {
        return this.request('PUT', `/api/payments/escrow/${id}/resolve`, { resolutionNote });
    }

    async getMyPayments() {
        return this.request('GET', '/api/payments/mine');
    }

    async getInvoice(id) {
        return this.request('GET', `/api/payments/${id}/invoice`);
    }

    // ===== MAINTENANCE REQUESTS =====
    async getMaintenanceRequests() {
        return this.request('GET', '/api/maintenance');
    }

    async getMyMaintenanceRequests() {
        return this.request('GET', '/api/maintenance/mine');
    }

    async getMaintenanceByTenant(tenantId) {
        return this.request('GET', `/api/maintenance/tenant/${tenantId}`);
    }

    async getMaintenanceByOwner(ownerId) {
        return this.request('GET', `/api/maintenance/owner/${ownerId}`);
    }

    async createMaintenanceRequest(request) {
        return this.request('POST', '/api/maintenance', request);
    }

    async updateMaintenanceRequestStatus(id, status, resolutionNote) {
        return this.request('PUT', `/api/maintenance/${id}/status`, { status, resolutionNote });
    }

    // ===== REAL-TIME STATS (public) =====
    async getPublicStats() {
        return this.request('GET', '/api/stats');
    }

    // ===== REAL PHOTO UPLOAD =====
    async uploadPropertyPhoto(propertyId, file) {
        const formData = new FormData();
        formData.append('file', file);
        return this.request('POST', `/api/properties/${propertyId}/photos/upload`, formData, true);
    }
    async getFavorites() {
        return this.request('GET', '/api/favorites');
    }

    async addFavorite(favorite) {
        return this.request('POST', '/api/favorites', favorite);
    }

    async removeFavorite(id) {
        return this.request('DELETE', `/api/favorites/${id}`);
    }

    async getFavoritesByUser(userId) {
        return this.request('GET', `/api/favorites/user/${userId}`);
    }

    // ===== NOTIFICATIONS =====
    async getNotifications() {
        return this.request('GET', '/api/notifications');
    }

    async createNotification(notification) {
        return this.request('POST', '/api/notifications', notification);
    }

    async markNotificationRead(id) {
        return this.request('PUT', `/api/notifications/${id}/read`);
    }

    async getNotificationsByUser(userId) {
        return this.request('GET', `/api/notifications/user/${userId}`);
    }

    // ===== OWNER APPLICATIONS =====
    async getOwnerApplications() {
        return this.request('GET', '/api/owner-applications');
    }

    async createOwnerApplication(application) {
        return this.request('POST', '/api/owner-applications', application);
    }

    async updateOwnerApplicationStatus(id, status, adminNote) {
        return this.request('PUT', `/api/owner-applications/${id}/status`, { status, adminNote });
    }

    // ===== ACCOUNT LIFECYCLE (self-service) =====
    // Deactivate the account (soft). User can no longer log in.
    async deactivateAccount() {
        return this.request('POST', '/api/account/deactivate', {});
    }

    // Permanently delete the account + all data. Not reversible.
    async deleteAccount() {
        return this.request('DELETE', '/api/account', null);
    }

    // ===== PUBLIC CONFIG (no auth required) =====
    // Fetches non-secret keys (Google Client ID, reCAPTCHA Site Key) that the
    // browser needs BEFORE login. These are set by the owner via Admin →
    // Integrations, so the site upgrades to real services with zero code changes.
    async getPublicConfig() {
        return this.request('GET', '/api/public/config');
    }

    // ===== INTEGRATIONS (ADMIN ONLY) =====
    async getIntegrationStatus() {
        return this.request('GET', '/api/integrations/status');
    }

    async saveIntegration(key, value) {
        return this.request('PUT', '/api/integrations', { key, value });
    }

    async deleteIntegration(key) {
        return this.request('DELETE', `/api/integrations/${encodeURIComponent(key)}`);
    }

    // ===== FEATURE PAGE SYSTEM (documents / feedback / tickets) =====

    // Upload a document (PDF/JPG/PNG) for a feature page.
    async uploadDocument(pageKey, file, docType = '', meta = '') {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('pageKey', pageKey);
        if (docType) formData.append('docType', docType);
        if (meta) formData.append('meta', meta);
        return this.request('POST', '/api/documents/upload', formData, true);
    }

    // My uploaded documents.
    async getMyDocuments() {
        return this.request('GET', '/api/documents/mine');
    }

    // All documents for a feature page.
    async getDocumentsByPage(pageKey) {
        return this.request('GET', `/api/documents/page/${encodeURIComponent(pageKey)}`);
    }

    // Documents received (owners: uploads tied to their properties).
    async getReceivedDocuments() {
        return this.request('GET', '/api/documents/received');
    }

    // Verify or reject a document (owner/admin).
    async updateDocumentStatus(id, status, reviewNote = '') {
        return this.request('PUT', `/api/documents/${id}/status`, { status, reviewNote });
    }

    // Delete one of my documents.
    async deleteDocument(id) {
        return this.request('DELETE', `/api/documents/${id}`);
    }

    // Submit feedback (stars 1-5 + comment) for a feature page.
    async submitFeedback(pageKey, stars, comment = '') {
        return this.request('POST', '/api/feedback', { pageKey, stars, comment });
    }

    // Feedback aggregate + recent entries for a feature page.
    async getFeedback(pageKey) {
        return this.request('GET', `/api/feedback/page/${encodeURIComponent(pageKey)}`);
    }

    // My feedback entries.
    async getMyFeedback() {
        return this.request('GET', '/api/feedback/mine');
    }

    // Raise a support ticket from a feature page.
    async createTicket(pageKey, subject, message) {
        return this.request('POST', '/api/tickets', { pageKey, subject, message });
    }

    // My tickets.
    async getMyTickets() {
        return this.request('GET', '/api/tickets/mine');
    }
}

// Global instance
const api = new HeavenLeaseAPI();

// Global XSS-safe helper (defined below near showToast)
api.escapeHtml = escapeHtml;

// ===== AUTOMATIC PAGE PROTECTION =====
// Pages that are PUBLIC (no login required).
// Security rule: ONLY the landing page (index.html / "/") is truly open.
// The auth-flow pages below must also remain public so users can log in / sign up.
// EVERY other page in this project requires authentication (deny-by-default),
// so typing any other URL directly without a session will be redirected to login.
const PUBLIC_PAGES = [
    'index',
    'login',
    'signup',
    'forgot-password',
    'reset-password',
    'otp-verify',
    'verify-email',
    'verify-account',
    '404'
];

// ALL other pages require authentication
// Static list of existing pages in the project (auto-protected)
const PROTECTED_PAGES = [
    'dashboard',
    'home',
    'messages',
    'notifications',
    'payment',
    'saved-properties',
    'tour-booking',
    'lease-signing',
    'rent-collection',
    'owner-application',
    'list-property',
    'upgrade-plan',
    'owner-verify',
    'helper',
    'admin-dashboard',
    'edit-profile',
    // ---- formation.md new pages ----
    'edit-property',
    'properties-management',
    'owner-applications',
    'tenant-management',
    'lease-management',
    'lease-details',
    'documents',
    'account-settings',
    'security-settings',
    'notification-settings',
    'rental-application',
    'application-status',
    'application-history',
    'property-compare',
    'saved-searches',
    'payment-methods',
    'transaction-history',
    'maintenance-request',
    'maintenance-requests',
    'faq',
    'blog-detail',
    'write-review',
    'report-property',
    'report-user',
    'support-tickets',
    'support-ticket-detail'
];

// Pages that require OWNER role (or higher)
const OWNER_PAGES = [
    'list-property',
    'owner-application',
    'rent-collection',
    'owner-verify',
    // ---- formation.md owner pages ----
    'edit-property',
    'properties-management',
    'owner-applications',
    'tenant-management',
    'lease-management',
    'lease-details',
    'maintenance-requests'
];

// Pages that are TENANT-facing. An OWNER/VERIFIED_OWNER account is redirected
// back to the hub so owners never see tenant-only tools (and vice-versa).
const TENANT_PAGES = [
    // ---- formation.md tenant pages ----
    'rental-application',
    'application-status',
    'application-history',
    'maintenance-request',
    'documents',
    'account-settings',
    'payment-methods'
];

// Pages that require ADMIN role
const ADMIN_PAGES = [
    'admin-dashboard'
];

// Automatically protect pages on load
(function() {
    // Pages that keep their own intentionally minimal navbar (no injection).
    const NO_NAV_PAGES = ['index', 'login', 'signup', 'forgot-password', 'reset-password',
        'otp-verify', 'verify-email', 'verify-account', '404'];

    // Normalize to the clean URL page name (strip any .html suffix; "/" -> index)
    let currentPage = window.location.pathname.split('/').pop() || 'index';
    currentPage = currentPage.replace(/\.html$/, '') || 'index';

    // If it's a public page, skip
    if (PUBLIC_PAGES.includes(currentPage)) return;

    // ===== QUICK NAVBAR (important-page buttons) =====
    // Injected on every non-landing, non-auth page so "Main Home" and the key
    // tools are always one click away from anywhere in the app.
    injectQuickNav(currentPage);

    // If it's an unknown page not in our list but not public, protect it too
    const isHtmlPage = currentPage.includes('.') || currentPage === '';

    // Check if page requires auth
    if (PROTECTED_PAGES.includes(currentPage) || (!PUBLIC_PAGES.includes(currentPage))) {
        if (!api.isAuthenticated()) {
            // At the landing/root page, login WITHOUT a redirect param so after
            // login we land on the dashboard (see redirectAfterLogin) — never back to index.
            const target = (currentPage === '' || currentPage === 'index') ? '' : currentPage;
            window.location.replace(target ? 'login?redirect=' + encodeURIComponent(target) : 'login');
            return;
        }
    }

    // Check if page requires owner role
    if (OWNER_PAGES.includes(currentPage)) {
        const user = api.getUser();
        const role = user ? user.role : '';
        if (!['OWNER', 'VERIFIED_OWNER', 'ADMIN'].includes(role)) {
            // Send to the main hub instead of the public landing page.
            window.location.replace('home');
            return;
        }
    }

    // Check if page is TENANT-only (block OWNER/VERIFIED_OWNER, keep ADMIN)
    if (TENANT_PAGES.includes(currentPage)) {
        const user = api.getUser();
        const role = user ? user.role : '';
        if (['OWNER', 'VERIFIED_OWNER'].includes(role)) {
            window.location.replace('home');
            return;
        }
    }

    // Check if page requires admin role
    if (ADMIN_PAGES.includes(currentPage)) {
        const user = api.getUser();
        const role = user ? user.role : '';
        if (role !== 'ADMIN') {
            // Send to the main hub instead of the public landing page.
            window.location.replace('home');
            return;
        }
    }

    // ===== QUICK NAVBAR BUILDER =====
    // Adds a single "Home" button to the navbar of every page except the landing
    // page and the auth-flow pages (those keep their intentionally minimal navbars).
    // Runs synchronously — api.js loads at the end of <body> so the navbar is
    // already parsed — and script.js, which loads after api.js, wires up the
    // hamburger toggle exactly once.
function injectQuickNav(page) {
        if (NO_NAV_PAGES.includes(page)) return;
        if (document.getElementById('navLinks')) return;

        const container = document.querySelector('.navbar .nav-container');
        const navActions = document.querySelector('.navbar .nav-actions');
        if (!container || !navActions) return;

        // ===== FORMATION NAVBAR (formation.md lines 96-105) =====
        // Clean main navigation: home · properties · buy & sell · how it works ·
        // pricing · about · blog · contact
        const links = [
            ['home', 'fa-home', 'Home', 'nav-c-indigo'],
            ['properties', 'fa-building', 'Properties', 'nav-c-blue'],
            ['buy-sell', 'fa-tag', 'Buy & Sell', 'nav-c-green'],
            ['blog', 'fa-newspaper', 'Blog', 'nav-c-purple'],
            ['contact', 'fa-envelope', 'Contact', 'nav-c-teal']
        ];

        const navLinks = document.createElement('div');
        navLinks.id = 'navLinks';
        navLinks.className = 'nav-links';
        links.forEach(function (item) {
            const a = document.createElement('a');
            a.href = item[0];
            a.className = 'nav-link ' + (item[3] || '');
            a.innerHTML = '<i class="fas ' + item[1] + '"></i> ' + item[2];
            navLinks.appendChild(a);
        });
        container.insertBefore(navLinks, navActions);

        if (!document.getElementById('hamburger')) {
            const ham = document.createElement('button');
            ham.id = 'hamburger';
            ham.className = 'hamburger';
            ham.setAttribute('aria-label', 'Open menu');
            ham.innerHTML = '<span></span><span></span><span></span>';
            container.insertBefore(ham, navActions);
        }
    }

    // ===== BACK-BUTTON AUTH BYPASS GUARD =====
    // When the page is shown (normal nav OR bfcache back/forward restore), if the
    // user is authenticated and lands on an auth/public page, force them to the hub.
    const AUTH_PUBLIC_ONLY_PAGES = ['login', 'signup', 'forgot-password', 'reset-password',
        'otp-verify', 'verify-email', 'verify-account'];
    if (AUTH_PUBLIC_ONLY_PAGES.includes(currentPage)) {
        window.addEventListener('pageshow', function () {
            if (api.isAuthenticated()) {
                window.location.replace('home');
            }
        });
    }

    // ===== DYNAMIC NAVBAR =====
    // On feature pages keep ONLY: logo + single "Home" link + account dropdown
    // (Account + Settings). All other action buttons are removed.
    function updateNavbar() {
        const isLoggedIn = api.isAuthenticated();
        const user = api.getUser();
        const role = user ? user.role : '';
        const isFeaturePage = !NO_NAV_PAGES.includes(currentPage);

        // Home & logo: for a logged-in user, "Home" => the main hub, not the
        // public landing page. Guests keep going to the landing page (index).
        const homeTarget = isLoggedIn ? 'home' : '/';
        document.querySelectorAll('a.logo, nav .nav-link').forEach(link => {
            const t = (link.textContent || '').trim().toLowerCase();
            if (link.classList.contains('logo') || t === 'home') {
                link.setAttribute('href', homeTarget);
            }
        });

        // Feature pages: remove ANY leftover action button so only the Home
        // link + avatar dropdown remain in the navbar.
        if (isFeaturePage) {
            document.querySelectorAll('.nav-actions a').forEach(a => {
                if (!a.closest('.user-menu') && !a.closest('#navLinks')) {
                    a.remove();
                }
            });
        }

        if (isLoggedIn) {
            let userMenu = document.querySelector('.nav-actions .user-menu');
            if (!userMenu) {
                userMenu = document.createElement('div');
                userMenu.className = 'user-menu';
                userMenu.id = 'userMenu';
                const navActions = document.querySelector('.nav-actions');
                if (navActions) navActions.appendChild(userMenu);
            }
            rebuildAccountMenu(userMenu, user, role);
        }
    }

    // Rebuild the account dropdown to ONLY "Account" + "Settings".
    // Account -> the user's account page; Settings -> nested dropdown with the
    // other feature page quick-links.
    function rebuildAccountMenu(userMenu, user, role) {
        const roleLower = String(role || '').toLowerCase();
        const accountHref = roleLower === 'admin' ? 'admin-dashboard' : 'dashboard';
        const editProfileHref = 'edit-profile';
        const userName = user && user.name ? user.name.split(' ')[0] : 'User';
        const initial = (user && user.name ? user.name.trim().charAt(0) : 'U').toUpperCase();

        // Role-aware settings menu: tenants see tenant tools, owners see owner tools.
        const isOwnerAccount = roleLower === 'owner' || roleLower === 'verified_owner';
        const isAdminAccount = roleLower === 'admin';
        const settingsLinks = isAdminAccount
            ? '<a href="admin-dashboard"><i class="fas fa-gauge-high"></i> Admin Dashboard</a>'
            : isOwnerAccount
                ? '<a href="dashboard" class="dd-link"><i class="fas fa-gauge-high"></i> My Dashboard</a>'
                    + '<a href="properties-management" class="dd-link"><i class="fas fa-house-circle-check"></i> Manage Properties</a>'
                    + '<a href="account-settings" class="dd-link"><i class="fas fa-sliders"></i> Account Settings</a>'
                    + '<a href="security-settings" class="dd-link"><i class="fas fa-shield-halved"></i> Security Settings</a>'
                    + '<a href="list-property" class="dd-link"><i class="fas fa-key"></i> List Your Property</a>'
                    + '<a href="lease-management" class="dd-link"><i class="fas fa-file-contract"></i> Manage Leases</a>'
                    + '<a href="maintenance-requests" class="dd-link"><i class="fas fa-toolbox"></i> Maintenance</a>'
                    + '<a href="rent-collection" class="dd-link"><i class="fas fa-hand-holding-dollar"></i> Rent Collection</a>'
                    + '<a href="tenant-screening" class="dd-link"><i class="fas fa-user-check"></i> Tenant Screening</a>'
                    + '<a href="owner-resources" class="dd-link"><i class="fas fa-toolbox"></i> Owner Resources</a>'
                    + '<a href="owner-verify" class="dd-link"><i class="fas fa-shield-halved"></i> Owner Verify</a>'
                    + '<a href="owner-application" class="dd-link"><i class="fas fa-file-circle-check"></i> Owner Application</a>'
                    + '<a href="owner-applications" class="dd-link"><i class="fas fa-users-gear"></i> Owner Applications</a>'
                    + '<a href="tenant-management" class="dd-link"><i class="fas fa-users"></i> Tenant Management</a>'
                    + '<a href="lease-details" class="dd-link"><i class="fas fa-file-lines"></i> Lease Details</a>'
                    + '<a href="edit-property" class="dd-link"><i class="fas fa-pen-to-square"></i> Edit Property</a>'
                    + '<a href="payment" class="dd-link"><i class="fas fa-credit-card"></i> Access Pass</a>'
                    + '<a href="properties" class="dd-link"><i class="fas fa-building"></i> Browse Properties</a>'
                    + '<a href="map" class="dd-link"><i class="fas fa-map-location-dot"></i> Property Map</a>'
                    + '<a href="comfort-scores" class="dd-link"><i class="fas fa-gauge-high"></i> Comfort Scores</a>'
                    + '<a href="saved-properties" class="dd-link"><i class="fas fa-heart"></i> Saved Properties</a>'
                    + '<a href="buy-sell" class="dd-link"><i class="fas fa-tag"></i> Buy / Sell</a>'
                    + '<a href="possession" class="dd-link"><i class="fas fa-key"></i> Possession &amp; Handover</a>'
                    + '<a href="lease-signing" class="dd-link"><i class="fas fa-file-signature"></i> Leases &amp; Signing</a>'
                    + '<a href="tour-booking" class="dd-link"><i class="fas fa-calendar-check"></i> Tour Bookings</a>'
                    + '<a href="messages" class="dd-link"><i class="fas fa-comments"></i> Messages</a>'
                    + '<a href="notifications" class="dd-link"><i class="fas fa-bell"></i> Notifications</a>'
                    + '<a href="upgrade-plan" class="dd-link"><i class="fas fa-rocket"></i> Upgrade Plan</a>'
                    + '<a href="how-it-works" class="dd-link"><i class="fas fa-circle-question"></i> How It Works</a>'
                    + '<a href="about" class="dd-link"><i class="fas fa-building"></i> About Us</a>'
                    + '<a href="blog" class="dd-link"><i class="fas fa-newspaper"></i> Blog</a>'
                    + '<a href="contact" class="dd-link"><i class="fas fa-envelope"></i> Contact &amp; Support</a>'
                : '<a href="dashboard" class="dd-link"><i class="fas fa-gauge-high"></i> My Dashboard</a>'
                    + '<a href="properties" class="dd-link"><i class="fas fa-building"></i> Browse Properties</a>'
                    + '<a href="rental-application" class="dd-link"><i class="fas fa-file-signature"></i> Rental Application</a>'
                    + '<a href="application-status" class="dd-link"><i class="fas fa-hourglass-half"></i> Application Status</a>'
                    + '<a href="account-settings" class="dd-link"><i class="fas fa-sliders"></i> Account Settings</a>'
                    + '<a href="security-settings" class="dd-link"><i class="fas fa-shield-halved"></i> Security Settings</a>'
                    + '<a href="maintenance-request" class="dd-link"><i class="fas fa-screwdriver-wrench"></i> Maintenance Request</a>'
                    + '<a href="documents" class="dd-link"><i class="fas fa-folder-tree"></i> Documents</a>'
                    + '<a href="application-history" class="dd-link"><i class="fas fa-clock-rotate-left"></i> Application History</a>'
                    + '<a href="property-compare" class="dd-link"><i class="fas fa-code-compare"></i> Compare Properties</a>'
                    + '<a href="saved-searches" class="dd-link"><i class="fas fa-magnifying-glass-location"></i> Saved Searches</a>'
                    + '<a href="payment-methods" class="dd-link"><i class="fas fa-wallet"></i> Payment Methods</a>'
                    + '<a href="transaction-history" class="dd-link"><i class="fas fa-money-bill-transfer"></i> Transaction History</a>'
                    + '<a href="support-tickets" class="dd-link"><i class="fas fa-headset"></i> Support Tickets</a>'
                    + '<a href="map" class="dd-link"><i class="fas fa-map-location-dot"></i> Property Map</a>'
                    + '<a href="comfort-scores" class="dd-link"><i class="fas fa-gauge-high"></i> Comfort Scores</a>'
                    + '<a href="saved-properties" class="dd-link"><i class="fas fa-heart"></i> Saved Properties</a>'
                    + '<a href="payment" class="dd-link"><i class="fas fa-credit-card"></i> Access Pass</a>'
                    + '<a href="tenant-screening" class="dd-link"><i class="fas fa-user-check"></i> Tenant Screening</a>'
                    + '<a href="owner-resources" class="dd-link"><i class="fas fa-toolbox"></i> Owner Resources</a>'
                    + '<a href="buy-sell" class="dd-link"><i class="fas fa-tag"></i> Buy / Sell</a>'
                    + '<a href="possession" class="dd-link"><i class="fas fa-key"></i> Possession &amp; Handover</a>'
                    + '<a href="lease-signing" class="dd-link"><i class="fas fa-file-signature"></i> Leases &amp; Signing</a>'
                    + '<a href="tour-booking" class="dd-link"><i class="fas fa-calendar-check"></i> Tour Bookings</a>'
                    + '<a href="messages" class="dd-link"><i class="fas fa-comments"></i> Messages</a>'
                    + '<a href="notifications" class="dd-link"><i class="fas fa-bell"></i> Notifications</a>'
                    + '<a href="upgrade-plan" class="dd-link"><i class="fas fa-rocket"></i> Upgrade Plan</a>'
                    + '<a href="how-it-works" class="dd-link"><i class="fas fa-circle-question"></i> How It Works</a>'
                    + '<a href="about" class="dd-link"><i class="fas fa-building"></i> About Us</a>'
                    + '<a href="blog" class="dd-link"><i class="fas fa-newspaper"></i> Blog</a>'
                    + '<a href="contact" class="dd-link"><i class="fas fa-envelope"></i> Contact &amp; Support</a>';

        userMenu.innerHTML = `
            <button class="user-menu-trigger" id="profileBtn" aria-label="Account menu">
                <span class="user-avatar">${user && user.avatarUrl ? '<img src="' + user.avatarUrl + '" alt="avatar" class="nav-avatar-img">' : initial}</span>
                <span id="navUserName">${userName}</span>
                <i class="fas fa-chevron-down"></i>
            </button>
            <div class="user-dropdown" id="profileDropdown">
                <a href="${accountHref}" class="dd-account"><i class="fas fa-user"></i> Account</a>
                <a href="${editProfileHref}" class="dd-account dd-account-sub"><i class="fas fa-user-pen"></i> Edit Profile</a>
                <div class="dd-settings" id="ddSettings">
                    <button type="button" class="dd-settings-toggle"><i class="fas fa-gear"></i> Settings <i class="fas fa-chevron-right"></i></button>
                    <div class="dd-settings-menu">${settingsLinks}
                        <div class="dropdown-divider"></div>
                        <a href="#" class="logout-link"><i class="fas fa-sign-out-alt"></i> Logout</a>
                    </div>
                </div>
            </div>
        `;
        userMenu.querySelector('.user-menu-trigger').dataset.hlWired = '1';

        // Dropdown open/close
        const trigger = userMenu.querySelector('.user-menu-trigger');
        const dropdown = userMenu.querySelector('.user-dropdown');
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('show');
        });
        document.addEventListener('click', (e) => {
            if (!userMenu.contains(e.target)) dropdown.classList.remove('show');
        });

        // Settings submenu open/close
        const settings = userMenu.querySelector('#ddSettings');
        const settingsBtn = userMenu.querySelector('.dd-settings-toggle');
        settingsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            settings.classList.toggle('open');
        });
        document.addEventListener('click', (e) => {
            if (!settings.contains(e.target)) settings.classList.remove('open');
        });

        // Logout
        userMenu.querySelector('.logout-link').addEventListener('click', (e) => {
            e.preventDefault();
            api.logout();
        });
    }

    // ===== SESSION USER AUTO-REFRESH =====
    // Always sync the stored user with the real database record on page load.
    // This guarantees Google/OTP/phone logins show the correct name/email/phone
    // everywhere (navbar, profile, dashboards) even if an old session's
    // localStorage user object was missing fields.
    async function refreshSessionUser() {
        if (!api.isAuthenticated()) return;
        try {
            const me = await api.getMe();
            if (!me || me.id == null) return;
            const stored = api.getUser() || {};
            api.setUser({
                ...stored,
                id: me.id,
                email: me.email || stored.email || '',
                role: me.role || stored.role || 'TENANT',
                name: me.fullName || me.name || stored.name || '',
                phone: me.phone || stored.phone || '',
                username: me.username || stored.username || '',
                bio: me.bio || stored.bio || '',
                avatarUrl: me.avatarUrl || stored.avatarUrl || '',
                website: me.website || stored.website || '',
                gender: me.gender || stored.gender || '',
                verified: me.verified != null ? me.verified : stored.verified
            });
            // Re-render the navbar with the fresh name/avatar.
            const userMenu = document.querySelector('.nav-actions .user-menu');
            if (userMenu) {
                rebuildAccountMenu(userMenu, api.getUser(), api.getUser() ? api.getUser().role : '');
            }
        } catch (e) {
            // On 401 (stale/expired token — e.g. user row was wiped) log the session out
            // so the user lands on login and can re-authenticate (esp. Google login)
            // instead of being stuck on a blank/loading account page.
            if (e && e.status === 401) {
                api.logout();
            }
        }
    }

    // Run after DOM is ready
    function bootNavbar() {
        updateNavbar();
        if (api.isAuthenticated()) refreshSessionUser();
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootNavbar);
    } else {
        bootNavbar();
    }
    // ===== GUARANTEED Home / logo routing =====
    // Delegated click handler that ALWAYS routes Home & the logo correctly.
    // Logged-in => dashboard hub; guests => landing page.
    document.addEventListener('click', function (e) {
        const link = e.target.closest('a[href]');
        if (!link) return;
        const hrefAttr = link.getAttribute('href');
        const isLogo = link.classList.contains('logo');
        const isHome = (link.textContent || '').trim().toLowerCase() === 'home' || /home/i.test(link.className);
        const isLogin = link.id === 'authNavBtn' || /^log\\s*in$/i.test((link.textContent||'').trim());
        if ((hrefAttr === '/' && (isLogo || isHome)) || (isLogin && hrefAttr === 'login')) {
e.preventDefault();
            window.location.href = api.isAuthenticated() ? 'home' : (hrefAttr === 'login' ? 'login' : '/');
        }
    });
})();

// Auth guard - redirect to login if not authenticated
function requireAuth() {
    if (!api.isAuthenticated()) {
        let currentPage = window.location.pathname.split('/').pop() || 'index'; currentPage = currentPage.replace(/\.html$/,'') || 'index';
        // At the landing/root page, go to login WITHOUT a redirect param so after
        // login we go to the dashboard — never back to index.
        const target = (currentPage === '' || currentPage === 'index') ? '' : currentPage;
        window.location.href = target ? 'login?redirect=' + encodeURIComponent(target) : 'login';
        return false;
    }
    return true;
}

// Auth guard for owner-only pages
function requireOwner() {
    if (!requireAuth()) return false;
    const user = api.getUser();
    if (user && (user.role === 'OWNER' || user.role === 'VERIFIED_OWNER' || user.role === 'ADMIN')) {
        return true;
    }
    // Send to the main hub instead of the public landing page.
    window.location.href = 'home';
    return false;
}

// Auth guard for admin-only pages
function requireAdmin() {
    if (!requireAuth()) return false;
    const user = api.getUser();
    if (user && user.role === 'ADMIN') {
        return true;
    }
    // Send to the main hub instead of the public landing page.
    window.location.href = 'home';
    return false;
}

// Validate email format
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Validate phone format (Indian numbers)
function isValidPhone(phone) {
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(phone);
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(amount || 0);
}

// Format date
function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Show toast notification
function showToast(message, type = 'success') {
    const existingToast = document.querySelector('.toast');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
        <span>${message}</span>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Show error message
function showError(message) {
    showToast(message, 'error');
}

// Show success message
function showSuccess(message) {
    showToast(message, 'success');
}

// ===== XSS SAFE OUTPUT =====
// Escape user-controlled text before it is inserted via innerHTML anywhere.
function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Handle API error
function handleApiError(error) {
    console.error('API Error:', error);
    showError(error.message || 'An unexpected error occurred');
    return null;
}

// ===== CAPTCHA HELPERS =====
// reCAPTCHA boots lazily using the site key served by the backend
// (/api/public/config). When RECAPTCHA_VERSION=v2, a visible checkbox is
// rendered into any container marked data-recaptcha-v2; the token is only
// considered valid after the visitor ticks it. Otherwise v3 (invisible) is used.
// Falls back to a mock token only when no site key is configured.
let recaptchaLoadPromise = null;

// Ensure the reCAPTCHA script is loaded once and window.RECAPTCHA_SITE_KEY is set.
function ensureRecaptchaLoaded() {
    if (recaptchaLoadPromise) return recaptchaLoadPromise;
    recaptchaLoadPromise = (async () => {
        try {
            if (window.grecaptcha && window.RECAPTCHA_SITE_KEY) return true;

            // Pull the site key from the backend (from .env or Admin -> Integrations).
            let siteKey = window.RECAPTCHA_SITE_KEY || '';
            try {
                const cfg = await api.getPublicConfig();
                if (cfg && cfg.recaptchaSiteKey) siteKey = cfg.recaptchaSiteKey;
                if (cfg && cfg.recaptchaVersion) window.RECAPTCHA_VERSION = cfg.recaptchaVersion;
            } catch (e) {
                console.warn('reCAPTCHA config fetch failed:', e);
            }
            if (!siteKey) return false;

            window.RECAPTCHA_SITE_KEY = siteKey;
            if (window.grecaptcha) return true;

            // v2 (checkbox) loads the same script (no ?render=); v3 uses ?render=SITE_KEY.
            const scriptUrl = window.RECAPTCHA_VERSION === 'v2'
                ? 'https://www.google.com/recaptcha/api.js'
                : 'https://www.google.com/recaptcha/api.js?render=' + siteKey;

            // Inject the script.
            return await new Promise((resolve) => {
                const existing = document.querySelector('script[src*="recaptcha/api.js"]');
                if (existing) {
                    if (window.grecaptcha) { resolve(true); return; }
                    existing.addEventListener('load', () => resolve(true), { once: true });
                    return;
                }
                const script = document.createElement('script');
                script.src = scriptUrl;
                script.async = true;
                script.defer = true;
                script.onload = () => {
                    // For v2, render a checkbox into every placeholder container.
                    if (window.RECAPTCHA_VERSION === 'v2' && window.grecaptcha && window.RECAPTCHA_SITE_KEY) {
                        // grecaptcha.ready() guarantees the API is fully loaded before
                        // render() — firing render directly in onload is racy and can
                        // leave the checkbox blank.
                        grecaptcha.ready(() => {
                            document.querySelectorAll('[data-recaptcha-v2]').forEach((el) => {
                                if (!el.dataset.rendered) {
                                    try {
                                        grecaptcha.render(el, {
                                            sitekey: window.RECAPTCHA_SITE_KEY,
                                            callback: (token) => { el.dataset.token = token; },
                                            'expired-callback': () => { delete el.dataset.token; }
                                        });
                                        el.dataset.rendered = '1';
                                        // Only now that the REAL checkbox exists do we reveal
                                        // the container. It stays hidden otherwise — no empty
                                        // gap on the login/signup form.
                                        const row = el.closest('.recaptcha-row');
                                        if (row) row.style.display = '';
                                    } catch (e) { console.warn('reCAPTCHA v2 render failed:', e); }
                                }
                            });
                        });
                    }
                    resolve(true);
                };
                script.onerror = () => {
                    console.warn('reCAPTCHA script failed to load - using mock token');
                    resolve(false);
                };
                (document.head || document.documentElement).appendChild(script);
            });
        } catch (e) {
            console.warn('reCAPTCHA bootstrap failed:', e);
            return false;
        }
    })();
    return recaptchaLoadPromise;
}

// Returns a real reCAPTCHA token, or a mock token if the site key is not configured.
// For v2, the token comes from the checkbox that the visitor ticked.
async function getCaptchaToken(action = 'submit') {
    const loaded = await ensureRecaptchaLoaded();
    if (loaded && window.grecaptcha && window.RECAPTCHA_SITE_KEY) {
        // v2 checkbox: find the first rendered container that has a token.
        if (window.RECAPTCHA_VERSION === 'v2') {
            const el = document.querySelector('[data-recaptcha-v2][data-token]');
            if (el && el.dataset.token) return el.dataset.token;
            // Checkbox not ticked yet -> surface a clear error in the UI.
            throw new Error('Please complete the reCAPTCHA checkbox to continue.');
        }
        try {
            return await new Promise((resolve) => {
                grecaptcha.ready(async () => {
                    const token = await grecaptcha.execute(window.RECAPTCHA_SITE_KEY, { action });
                    resolve(token);
                });
            });
        } catch (e) {
            console.warn('reCAPTCHA failed, using mock token:', e);
            return 'mock-captcha-token-' + Date.now();
        }
    }
    // Mock token (no real key configured or load failed)
    return 'mock-captcha-token-' + Date.now();
}

// ===== WATERMARK =====
// Insert developer watermark on index.html and dashboard.html (main pages only)
function insertWatermark() {
    return;
}

// ===== DARK MODE =====
const THEME_KEY = 'heavenlease_theme';

// Apply the saved theme (or default light) on page load
(function applyTheme() {
    try {
        const saved = localStorage.getItem(THEME_KEY);
        if (saved === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
        }
    } catch (e) { /* localStorage unavailable */ }
})();

// Toggle dark/light theme and persist the choice
function toggleTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) {
        document.documentElement.removeAttribute('data-theme');
        try { localStorage.setItem(THEME_KEY, 'light'); } catch (e) {}
        updateThemeIcon(false);
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        try { localStorage.setItem(THEME_KEY, 'dark'); } catch (e) {}
        updateThemeIcon(true);
    }
}

// Update the toggle button icon to reflect current theme
function updateThemeIcon(isDark) {
    document.querySelectorAll('.theme-toggle i').forEach(icon => {
        icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
    });
}

// Inject dark-mode toggle button into the navbar on every page
(function injectThemeToggle() {
    const apply = () => {
        const navActions = document.querySelector('.nav-actions');
        if (!navActions || navActions.querySelector('.theme-toggle')) return;
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const btn = document.createElement('button');
        btn.className = 'theme-toggle';
        btn.setAttribute('aria-label', 'Toggle dark mode');
        btn.title = 'Toggle dark mode';
        btn.innerHTML = `<i class="fas ${isDark ? 'fa-sun' : 'fa-moon'}"></i>`;
        btn.addEventListener('click', toggleTheme);
        navActions.appendChild(btn);
    };
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', apply);
    } else {
        apply();
    }
})();

// ===== SMART BACK BUTTON =====
// Adds a "Back" button to the navbar on every authenticated page.
// - Navigates to the previous page via history.back() when it is a SAFE
//   internal page (never an auth page like login/signup and never the public
//   index/landing) while the user is still logged in.
// - Otherwise goes to the role-friendly home page.
const AUTH_ONLY_PAGES = ['login', 'signup', 'forgot-password', 'reset-password',
    'otp-verify', 'verify-email', 'verify-account', 'index'];

(function injectSmartBackButton() {
    const apply = () => {
        // Only on pages that are NOT the public/auth pages
        const page = (window.location.pathname.split('/').pop() || 'index').replace(/\.html$/, '') || 'index';
        if (AUTH_ONLY_PAGES.includes(page)) return;

        const navActions = document.querySelector('.nav-actions');
        if (!navActions || navActions.querySelector('.back-btn')) return;

        const btn = document.createElement('button');
        btn.className = 'back-btn';
        btn.setAttribute('aria-label', 'Go back');
        btn.title = 'Go back to previous page';
        btn.innerHTML = '<i class="fas fa-arrow-left"></i>';
        btn.addEventListener('click', () => {
            // If we have history and the previous entry is an in-site safe page,
            // go back. Otherwise, go to home.
            try {
                const ref = document.referrer || '';
                const isInternalSafe = ref && ref.indexOf(location.origin) === 0
                    && !AUTH_ONLY_PAGES.some(p => ref.indexOf('/' + p) !== -1);
                if (isInternalSafe && window.history.length > 1) {
                    window.history.back();
                } else {
                    window.location.href = 'home';
                }
            } catch (e) {
                window.location.href = 'home';
            }
        });
        navActions.appendChild(btn);
    };
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', apply);
    } else {
        apply();
    }
})();
// ===== GLOBAL BUTTON SPINNERS =====
// Adds a loading spinner to any button with class "btn-loading" when clicked
document.addEventListener('submit', (e) => {
    const btn = e.target.querySelector('button[type="submit"]');
    if (btn && !btn.dataset.originalHtml) {
        btn.dataset.originalHtml = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
        setTimeout(() => {
            btn.disabled = false;
            btn.innerHTML = btn.dataset.originalHtml;
            btn.dataset.originalHtml = '';
        }, 2000);
    }
});

// ===== REAL-TIME MESSAGING (WebSocket) =====
// Lightweight STOMP-over-WebSocket client (no external library needed).
// Connects to /ws, subscribes to /topic/messages, and calls onMessage.
// Usage:
//   connectWebSocket((msg) => { console.log('New message:', msg); });
//   sendWebSocketMessage({ conversationId, senderId, senderName, content, timestamp });
let wsSocket = null;
let wsConnected = false;

function connectWebSocket(onMessage) {
    const proto = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
    const url = proto + window.location.host + '/ws';
    try {
        wsSocket = new WebSocket(url);
        wsSocket.onopen = () => { wsConnected = true; };
        wsSocket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (onMessage) onMessage(data);
            } catch (e) { /* ignore non-JSON frames */ }
        };
        wsSocket.onclose = () => { wsConnected = false; };
        wsSocket.onerror = () => { wsConnected = false; };
    } catch (e) {
        wsConnected = false;
    }
}

function sendWebSocketMessage(payload) {
    if (wsSocket && wsConnected) {
        wsSocket.send(JSON.stringify(payload));
    }
}
