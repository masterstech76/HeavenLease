/* ============================================================
 * HeavenLease — rental-laws page module
 * Extracted from rental-laws.html (1 inline block).
 * Removes all inline <script> from the page per project rule.
 * ============================================================ */

// Existing page behavior retained: navbar scroll state and back-to-top behavior.
        // navbar, hamburger, navLinks and backToTop may already be declared by script.js.
        window.addEventListener('scroll', () => {
            if (typeof navbar !== 'undefined' && navbar) {
                if (window.scrollY > 50) navbar.classList.add('scrolled');
                else navbar.classList.remove('scrolled');
            }

            if (typeof backToTop !== 'undefined' && backToTop) {
                if (window.scrollY > 500) backToTop.classList.add('visible');
                else backToTop.classList.remove('visible');
            }
        });

        if (typeof hamburger !== 'undefined' && hamburger) {
            hamburger.addEventListener('click', () => {
                hamburger.classList.toggle('active');
                if (typeof navLinks !== 'undefined' && navLinks) navLinks.classList.toggle('active');
            });
        }

        if (typeof hamburger !== 'undefined' && hamburger &&
            typeof navLinks !== 'undefined' && navLinks) {
            document.querySelectorAll('.nav-link').forEach(link => {
                link.addEventListener('click', () => {
                    hamburger.classList.remove('active');
                    navLinks.classList.remove('active');
                });
            });
        }

        if (typeof backToTop !== 'undefined' && backToTop) {
            backToTop.addEventListener('click', () => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        }
