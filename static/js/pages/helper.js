/* ============================================================
 * HeavenLease — helper page module
 * Extracted from helper.html (1 inline block).
 * Removes all inline <script> from the page per project rule.
 * ============================================================ */

(function() {
        // Navbar
        const navbar = document.getElementById('navbar');
        const hamburger = document.getElementById('hamburger');
        const navLinks = document.getElementById('navLinks');

        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) navbar.classList.add('scrolled');
            else navbar.classList.remove('scrolled');
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

        window.toggleFaq = function(el) {
            const item = el.parentElement;
            item.classList.toggle('open');
        };

        window.scrollToFaq = function(id) {
            const el = document.getElementById(id);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        };

        window.filterFaq = function(value) {
            const q = value.toLowerCase();
            document.querySelectorAll('.faq-item').forEach(item => {
                const text = item.textContent.toLowerCase();
                item.style.display = text.includes(q) ? '' : 'none';
            });
        };

        // Support form
        document.getElementById('supportForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('supportName').value;
            const email = document.getElementById('supportEmail').value;
            const message = document.getElementById('supportMessage').value;

            if (!name || !email || !message) {
                showToast('Please fill in all required fields.', 'error');
                return;
            }
            if (!isValidEmail(email)) {
                showToast('Please enter a valid email address.', 'error');
                return;
            }

            const btn = e.target.querySelector('button[type="submit"]');
            const original = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
            btn.disabled = true;

            setTimeout(() => {
                btn.innerHTML = original;
                btn.disabled = false;
                e.target.reset();
                showToast('Message sent! Our team will reply within 24 hours.', 'success');
            }, 1500);
        });
        })();
