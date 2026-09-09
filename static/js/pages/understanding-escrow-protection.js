/* ============================================================
 * HeavenLease — understanding-escrow-protection page module
 * Extracted from understanding-escrow-protection.html (1 inline block).
 * Removes all inline <script> from the page per project rule.
 * ============================================================ */

const navbar = document.getElementById('navbar');
        const hamburger = document.getElementById('hamburger');
        const navLinks = document.getElementById('navLinks');
        const backToTop = document.getElementById('backToTop');

        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) navbar.classList.add('scrolled'); else navbar.classList.remove('scrolled');
            if (window.scrollY > 500) backToTop.classList.add('visible'); else backToTop.classList.remove('visible');
        });

        if (hamburger) hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navLinks.classList.toggle('active');
        });

        document.querySelectorAll('.nav-link').forEach(link => link.addEventListener('click', () => {
            if (hamburger) hamburger.classList.remove('active');
            if (navLinks) navLinks.classList.remove('active');
        }));

        backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
