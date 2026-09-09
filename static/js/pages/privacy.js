/* ============================================================
 * HeavenLease — privacy page module
 * Extracted from privacy.html (1 inline block).
 * Removes all inline <script> from the page per project rule.
 * ============================================================ */

// Note: navbar, hamburger, navLinks, backToTop are already declared in script.js

        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) navbar.classList.add('scrolled');
            else navbar.classList.remove('scrolled');
            if (window.scrollY > 500) backToTop.classList.add('visible');
            else backToTop.classList.remove('visible');
        });

        if (hamburger) hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navLinks.classList.toggle('active');
        });

        if (hamburger && navLinks) {
            document.querySelectorAll('.nav-link').forEach(link => {
                link.addEventListener('click', () => {
                    hamburger.classList.remove('active');
                    navLinks.classList.remove('active');
                });
            });
        }

        backToTop.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
