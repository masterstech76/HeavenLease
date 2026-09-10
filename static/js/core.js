let propertyCache = [];

function setAllProperties(list) {
    if (Array.isArray(list)) propertyCache = list;
}

function loadAllProperties() {
    return propertyCache;
}

/* ===== REAL BACKEND HELPERS ===== */
// Normalize a backend Property into the display shape the cards/site already use.
function normalizeProperty(p) {
    if (!p) return p;
    const parts = [p.city, p.locality || p.address].filter(Boolean);
    const location = p.location || parts.join(', ');
    return Object.assign({}, p, {
        id: p.id,
        price: (p.price !== undefined && p.price !== null) ? p.price : (p.rentAmount || 0),
        rentAmount: p.rentAmount,
        location: location,
        owner: p.owner || p.ownerName,
        phone: p.phone || p.ownerPhone,
        email: p.email || p.ownerEmail,
        contactLocked: p.contactLocked
    });
}

// Fetch properties from the real backend (empty list on failure so pages keep working).
async function fetchApiProperties(page = 0, size = 100) {
    try {
        const list = await api.getProperties(page, size);
        const arr = Array.isArray(list) ? list : [];
        const normalized = arr.map(normalizeProperty);
        setAllProperties(normalized);
        return normalized;
    } catch (e) {
        return [];
    }
}

/* ===== DOM ELEMENTS ===== */
const navbar = document.getElementById('navbar');
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');
const backToTop = document.getElementById('backToTop');
const propertiesGrid = document.getElementById('propertiesGrid');
const searchBtn = document.getElementById('searchBtn');
const contactForm = document.getElementById('contactForm');

/* ===== NAVBAR SCROLL EFFECT ===== */
if (navbar) {
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
}

// Back to top button
if (backToTop) {
    window.addEventListener('scroll', () => {
        if (window.scrollY > 500) {
            backToTop.classList.add('visible');
        } else {
            backToTop.classList.remove('visible');
        }
    });

    backToTop.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// Active nav link highlighting
window.addEventListener('scroll', () => {
    if (!navbar) return;
    const sections = document.querySelectorAll('section[id]');
    const scrollPos = window.scrollY + 100;

    sections.forEach(section => {
        if (scrollPos >= section.offsetTop && scrollPos < section.offsetTop + section.offsetHeight) {
            const currentId = section.getAttribute('id');
            document.querySelectorAll('.nav-link').forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${currentId}`) {
                    link.classList.add('active');
                }
            });
        }
    });
});

/* ===== SETTINGS MENU ===== */
document.addEventListener('click', (e) => {
    const settingsToggle = document.getElementById('settingsToggle');
    const settingsDropdown = document.getElementById('settingsDropdown');
    if (!settingsToggle || !settingsDropdown) return;
    
    if (e.target.closest('#settingsToggle')) {
        settingsDropdown.classList.toggle('show');
    } else if (!e.target.closest('.settings-menu')) {
        settingsDropdown.classList.remove('show');
    }
});

/* ===== PROFILE MENU (avatar dropdown, used by logged-in pages) ===== */
function initProfileMenu() {
    const trigger = document.getElementById('profileBtn');
    const dropdown = document.getElementById('profileDropdown');
    if (!trigger || !dropdown) return;

    // If api.js already rebuilt + wired this menu (Account + Settings), don't
    // re-add listeners (double-toggle would break it).
    if (trigger.dataset.hlWired) return;

    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('show');
    });
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#userMenu')) dropdown.classList.remove('show');
    });

    const isAuth = api.isAuthenticated();
    const user = api.getUser() || {};
    const name = user.fullName || user.name || '';

    // Hide the profile button entirely on public pages when NOT logged in? No —
    // we keep it but turn it into a Sign In affordance.
    const signInLink = document.getElementById('signInLink');
    const logoutLink = document.getElementById('logoutLink');
    const mainHomeLink = document.getElementById('mainHomeLink');
    // Auth-sensitive dropdown items
    document.querySelectorAll('.user-dropdown .auth-only').forEach(el => {
        el.style.display = isAuth ? '' : 'none';
    });

    if (signInLink) signInLink.style.display = isAuth ? 'none' : '';
    if (logoutLink) logoutLink.style.display = isAuth ? '' : 'none';
    if (mainHomeLink) {
        mainHomeLink.href = isAuth ? 'home' : '/';
        mainHomeLink.textContent = isAuth ? 'Main Home' : 'Home';
    }

    if (name) {
        const navName = document.getElementById('navUserName');
        if (navName) navName.textContent = name.split(' ').slice(0, 2).join(' ');
        const avatar = document.querySelector('#profileBtn .user-avatar');
        if (avatar) avatar.textContent = (name.trim().charAt(0) || 'U').toUpperCase();
    }

    // Single shared \"Edit Profile\" link (works for tenant AND owner accounts)
    const profileLink = document.getElementById('myProfileLink');
    if (profileLink) {
        profileLink.href = 'edit-profile';
    }

    // Logout
    if (logoutLink) {
        logoutLink.addEventListener('click', (e) => {
            e.preventDefault();
            api.setToken(null);
            api.setUser(null);
            window.location.href = 'login';
        });
    }
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initProfileMenu);
} else {
    initProfileMenu();
}

/* ===== PROFILE DROPDOWN HOVER BRIDGE ===== */
// The profile menu used to close the instant the cursor left the trigger and
// entered the gap between the button and the menu (every page used a different
// CSS top value), so by the time you reached an option the menu was already
// gone. This wires a grace-period hover open/close on every `.user-menu` and
// adds a tiny safety CSS rule so `.open` / `.show` always render the dropdown
// regardless of the page's own styling. Uses BOTH class names, survives
// api.js rebuilding the menu (MutationObserver), and is skipped on
// touch-only devices (they use the regular tap/click toggle).
(function initProfileMenuHoverBridge() {
    const finePointer = !window.matchMedia || window.matchMedia('(pointer: fine)').matches;
    if (!finePointer) return;

    function wire(menu) {
        if (!menu || menu.dataset.hlHoverWired) return;
        const drop = menu.querySelector('.user-dropdown, .hl-dropdown');
        if (!drop) return;
        menu.dataset.hlHoverWired = '1';
        let timer = null;
        const open = () => {
            if (timer) { clearTimeout(timer); timer = null; }
            drop.classList.add('open', 'show');
        };
        const scheduleClose = () => {
            if (timer) { clearTimeout(timer); timer = null; }
            timer = setTimeout(() => drop.classList.remove('open', 'show'), 250);
        };
        menu.addEventListener('mouseenter', open);
        menu.addEventListener('mouseleave', scheduleClose);
        drop.addEventListener('mouseenter', open);
        drop.addEventListener('mouseleave', scheduleClose);
    }

    function wireAll() {
        document.querySelectorAll('.user-menu').forEach(wire);
    }

    // Safety net: while the JS `.open` / `.show` classes are active, force the
    // menu visible even on pages that only ever show it via `:hover` CSS.
    const style = document.createElement('style');
    style.setAttribute('data-hl', 'dropdown-bridge');
    style.textContent = `
        .user-menu .user-dropdown.open, .user-menu .user-dropdown.show,
        .user-menu .hl-dropdown.open, .user-menu .hl-dropdown.show {
            display: block !important;
            opacity: 1 !important;
            visibility: visible !important;
        }
    `;
    document.head.appendChild(style);

    const boot = () => {
        wireAll();
        // Survive api.js replacing the userMenu inner content on auth refresh.
        new MutationObserver(wireAll).observe(document.body, { childList: true, subtree: true });
    };
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();

/* ===== DYNAMIC LOGO LINK (auth-aware) ===== */
document.addEventListener('DOMContentLoaded', function initLogoLink() {
    const logoLinks = document.querySelectorAll('.navbar .logo, footer .logo');
    const home = api.isAuthenticated() ? 'home' : '/';
    logoLinks.forEach(a => { a.setAttribute('href', home); });
});

/* ===== MOBILE MENU ===== */
if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navLinks.classList.toggle('active');
    });

    // Close mobile menu when clicking a link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            navLinks.classList.remove('active');
        });
    });
}

/* ===== COUNTER ANIMATION ===== */
function animateCounter(element) {
    const target = parseInt(element.getAttribute('data-target'));
    const duration = 2000;
    const start = 0;
    const startTime = performance.now();

    function updateCounter(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.floor(eased * (target - start) + start);
        element.textContent = current.toLocaleString('en-IN');
        
        if (progress < 1) {
            requestAnimationFrame(updateCounter);
        }
    }

    requestAnimationFrame(updateCounter);
}

// Intersection Observer for counters
const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            animateCounter(entry.target);
            counterObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.5 });

document.querySelectorAll('.stat-number').forEach(counter => {
    counterObserver.observe(counter);
});

/* ===== RENDER PROPERTIES ===== */
function formatPrice(price) {
    return '₹' + price.toLocaleString('en-IN');
}

function createPropertyCard(property) {
    // Use uploaded photo if available, otherwise use icon placeholder
    // SECURITY: all user-controlled text is HTML-escaped to prevent stored XSS.
    const imageContent = property.photos && property.photos.length > 0 
        ? `<img src="${property.photos[0]}" alt="${escapeHtml(property.title)}" style="width: 100%; height: 100%; object-fit: cover;">`
        : `<i class="fas ${escapeHtml(property.icon)}"></i>`;

    const amenitiesList = Array.isArray(property.amenities) && property.amenities.length > 0 
        ? property.amenities.map(amenity => `
            <span class="property-amenity">
                <i class="fas fa-check"></i> ${escapeHtml(amenity)}
            </span>
        `).join('')
        : `<span class="property-amenity"><i class="fas fa-check"></i> ${escapeHtml(property.bhk)} BHK</span>`;

    return `
        <div class="property-card fade-in-up" data-id="${property.id}">
            <div class="property-image">
                <div class="property-image-placeholder">
                    ${imageContent}
                </div>
                <span class="property-badge">
                    ${property.forSale ? `<i class="fas fa-tag"></i> For Sale` : `<i class="fas fa-check-circle"></i> ${escapeHtml(property.badge || 'Verified Owner')}`}
                </span>
                <button class="property-favorite" data-id="${property.id}" aria-label="Save property">
                    <i class="far fa-heart"></i>
                </button>
            </div>
            <div class="property-body">
                <h3 class="property-title">${escapeHtml(property.title)}</h3>
                <p class="property-location">
                    <i class="fas fa-location-dot"></i> ${escapeHtml(property.location)}
                </p>
                <div class="property-price">
                    <span class="price">${formatPrice(property.forSale && property.salePrice ? property.salePrice : property.price)}</span>
                    ${property.forSale ? '<span class="per-month" style="color:var(--secondary-dark);font-weight:600;">On sale</span>' : '<span class="per-month">/month</span>'}
                </div>
                <div class="property-amenities">
                    ${amenitiesList}
                </div>
                <div class="property-comfort">
                    <div class="comfort-score">
                        <i class="fas fa-volume-low"></i>
                        <span>Quiet ${property.quietness}%</span>
                    </div>
                    <div class="comfort-score">
                        <i class="fas fa-sun"></i>
                        <span>Sun ${property.sunlight}%</span>
                    </div>
                    <div class="comfort-score">
                        <i class="fas fa-car"></i>
                        <span>Commute ${property.commute}%</span>
                    </div>
                </div>
                <div class="property-actions">
                    <a href="property-detail?id=${property.id}" class="btn btn-primary">
                        <i class="fas fa-calendar-check"></i> Book Tour
                    </a>
                    <a href="messages?property=${encodeURIComponent(property.title)}" class="btn btn-outline">
                        <i class="fas fa-comments"></i> Chat
                    </a>
                </div>
            </div>
        </div>
    `;
}

function renderProperties(filteredProperties) {
    if (!propertiesGrid) return;
    const allProps = filteredProperties || loadAllProperties();
    propertiesGrid.innerHTML = allProps.map(createPropertyCard).join('');
    
    // Add fade-in animation with stagger
    const cards = propertiesGrid.querySelectorAll('.property-card');
    cards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
    });

    // Attach favorite button listeners
    document.querySelectorAll('.property-favorite').forEach(btn => {
        btn.addEventListener('click', toggleFavorite);
    });
}

/* ===== FAVORITE TOGGLE — real backend (with local fallback) ===== */
let apiFavoriteCache = []; // [{ id, propertyId }]

async function refreshApiFavorites() {
    const user = api.getUser();
    if (user && user.id) {
        try {
            const list = await api.getFavoritesByUser(user.id);
            apiFavoriteCache = (Array.isArray(list) ? list : []).map(f => ({ id: f.id, propertyId: Number(f.propertyId) }));
            return apiFavoriteCache;
        } catch (e) {}
    }
    apiFavoriteCache = [];
    return apiFavoriteCache;
}

function favoriteRecord(propertyId) {
    return apiFavoriteCache.find(f => f.propertyId === Number(propertyId));
}

function getFavorites() {
    try {
        return JSON.parse(localStorage.getItem('heavenlease_favorites') || '[]');
    } catch(e) {
        return [];
    }
}

function saveFavorites(favorites) {
    localStorage.setItem('heavenlease_favorites', JSON.stringify(favorites));
}

async function toggleFavorite(e) {
    e.preventDefault();
    const btn = e.currentTarget;
    const icon = btn.querySelector('i');
    const id = parseInt(btn.getAttribute('data-id'));
    const user = api.getUser();

    // When signed in → use the real backend
    if (user && user.id) {
        const existing = favoriteRecord(id);
        if (existing) {
            // Remove
            btn.classList.remove('active');
            icon.classList.remove('fas'); icon.classList.add('far');
            apiFavoriteCache = apiFavoriteCache.filter(f => f.id !== existing.id);
            try { await api.removeFavorite(existing.id); } catch(err) {}
        } else {
            // Add
            btn.classList.add('active');
            icon.classList.remove('far'); icon.classList.add('fas');
            try {
                const rec = await api.addFavorite({ propertyId: id });
                if (rec && rec.id) apiFavoriteCache.push({ id: rec.id, propertyId: id });
            } catch(err) {}
        }
        return;
    }

    // Guest fallback → local storage
    let favorites = getFavorites();
    if (btn.classList.contains('active')) {
        btn.classList.remove('active');
        icon.classList.remove('fas'); icon.classList.add('far');
        favorites = favorites.filter(f => f !== id);
    } else {
        btn.classList.add('active');
        icon.classList.remove('far'); icon.classList.add('fas');
        if (!favorites.includes(id)) favorites.push(id);
    }
    saveFavorites(favorites);
}

/* ===== PAYWALL HELPERS (server-backed subscription) ===== */
// Plan durations: ₹299/3mo, ₹459/6mo, ₹799/12mo
const PLAN_MONTHS = { 3: 3, 6: 6, 12: 12 };

// Cached subscription state from the backend (single source of truth).
let subscriptionState = null;

// Fetch the real subscription from /api/payments/subscription.
async function loadSubscription(refresh = false) {
    if (subscriptionState && !refresh) return subscriptionState;
    try {
        subscriptionState = await api.getSubscription();
    } catch (e) {
        subscriptionState = { active: false };
    }
    return subscriptionState;
}

// Is the current user a real, active subscriber? (server-side truth — never localStorage)
async function isPaidUser() {
    const sub = await loadSubscription();
    return !!(sub && sub.active);
}

// Redirect to payment when the user is not subscribed. Returns true if allowed.
async function requirePayment(redirectTo) {
    const paid = await isPaidUser();
    if (!paid) {
        const target = redirectTo || window.location.pathname.split('/').pop();
        window.location.href = 'payment?redirect=' + encodeURIComponent(target);
        return false;
    }
    return true;
}

/* ===== SEARCH & FILTER ===== */
function filterProperties() {
    if (!document.getElementById('searchLocation')) return;
    const location = document.getElementById('searchLocation').value.toLowerCase();
    const budget = document.getElementById('searchBudget').value;
    const bhk = document.getElementById('searchBhk').value;
    const pet = document.getElementById('searchPet').value;

    let filtered = loadAllProperties().filter(property => {
        if (location && !property.location.toLowerCase().includes(location) && 
            !property.title.toLowerCase().includes(location)) {
            return false;
        }
        if (budget && property.price > parseInt(budget)) {
            return false;
        }
        if (bhk && property.bhk !== parseInt(bhk)) {
            return false;
        }
        if (pet === 'yes' && !property.petFriendly) {
            return false;
        }
        if (pet === 'no' && property.petFriendly) {
            return false;
        }
        return true;
    });

    renderProperties(filtered);

    const propSection = document.getElementById('properties');
    if (propSection) {
        propSection.scrollIntoView({ behavior: 'smooth' });
    }
}

if (searchBtn) {
    searchBtn.addEventListener('click', filterProperties);
}

// Enter key on location input
const searchLocation = document.getElementById('searchLocation');
if (searchLocation) {
    searchLocation.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            filterProperties();
        }
    });
}

/* ===== QUICK FILTERS ===== */
document.querySelectorAll('.quick-filter').forEach(filter => {
    filter.addEventListener('click', () => {
        const filterType = filter.getAttribute('data-filter');
        const allProps = loadAllProperties();
        let filtered = [...allProps];

        switch (filterType) {
            case 'quiet':
                filtered = allProps.filter(p => p.quietness >= 85);
                break;
            case 'sunny':
                filtered = allProps.filter(p => p.sunlight >= 85);
                break;
            case 'furnished':
                filtered = allProps.filter(p => p.furnished);
                break;
            case 'near-metro':
                filtered = allProps.filter(p => p.commute >= 90);
                break;
        }

        renderProperties(filtered);
        const propSection = document.getElementById('properties');
        if (propSection) {
            propSection.scrollIntoView({ behavior: 'smooth' });
        }
    });
});

/* ===== SEARCH TABS ===== */
document.querySelectorAll('.search-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.search-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        const isPG = tab.getAttribute('data-tab') === 'pg';
        const searchBhk = document.getElementById('searchBhk');
        const searchPet = document.getElementById('searchPet');
        if (searchBhk) searchBhk.disabled = isPG;
        if (searchPet) searchPet.disabled = isPG;
    });
});

/* ===== CONTACT FORM ===== */
if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;

        if (!name || !email) {
            showToast('Please fill in all required fields.', 'error');
            return;
        }

        if (!isValidEmail(email)) {
            showToast('Please enter a valid email address.', 'error');
            return;
        }

        const submitBtn = contactForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
        submitBtn.disabled = true;

        setTimeout(() => {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
            contactForm.reset();
            showToast('Message sent successfully! We\'ll get back to you soon.', 'success');
        }, 1500);
    });
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/* ===== TOAST NOTIFICATION ===== */
function showToast(message, type = 'success') {
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
        <span>${message}</span>
    `;

    document.body.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

/* ===== SCROLL REVEAL ANIMATION ===== */
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('fade-in-up');
            revealObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.1 });

document.querySelectorAll('.section-header, .step-card, .feature-card, .pricing-card, .testimonial-card, .trust-item').forEach(el => {
    revealObserver.observe(el);
});

/* ===== INITIALIZE ===== */
document.addEventListener('DOMContentLoaded', () => {
    if (propertiesGrid) {
        renderProperties();
    }
    
    document.querySelectorAll('.hero-content > *').forEach((el, index) => {
        el.classList.add('fade-in-up');
        el.style.animationDelay = `${index * 0.1}s`;
    });
});

/* ===== ADD TOAST STYLES ===== */
const style = document.createElement('style');
style.textContent = `
    .toast {
        position: fixed;
        bottom: 32px;
        left: 50%;
        transform: translateX(-50%) translateY(100px);
        background: var(--white);
        color: var(--gray-700);
        padding: 16px 24px;
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-xl);
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 14px;
        font-weight: 500;
        z-index: 2000;
        opacity: 0;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        border-left: 4px solid var(--secondary);
        max-width: 90vw;
    }

    .toast.show {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
    }

    .toast-error {
        border-left-color: #EF4444;
    }

    .toast i {
        font-size: 20px;
    }

    .toast-success i {
        color: var(--secondary);
    }

    .toast-error i {
        color: #EF4444;
    }

    @media (max-width: 768px) {
        .toast {
            bottom: 20px;
            left: 16px;
            right: 16px;
            transform: translateY(100px);
            max-width: none;
        }

        .toast.show {
            transform: translateY(0);
        }
    }
`;
document.head.appendChild(style);


