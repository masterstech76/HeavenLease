/* ============================================================
 * HeavenLease — owner-guides page module
 * Extracted from owner-guides.html (2 inline blocks).
 * Removes all inline <script> from the page per project rule.
 * ============================================================ */

function clearHelpMessage() {
            var msg = document.getElementById('helpMessage'); if (msg) msg.value = '';
            var em = document.getElementById('helpEmail'); if (em) em.value = '';
            var note = document.getElementById('helpNote');
            if (note) note.textContent = 'Messages go to our support team by email. Prefer email? Write to support@heavenlease.in';
        }

        function sendHelpMessage() {
            var msgEl = document.getElementById('helpMessage');
            var msg = (msgEl && msgEl.value || '').trim();
            var em = document.getElementById('helpEmail');
            var email = (em && em.value || '').trim();
            var note = document.getElementById('helpNote');

            if (!msg) {
                if (note) note.textContent = 'Please type a short message first.';
                return;
            }

            var subject = encodeURIComponent('HeavenLease page enquiry');
            var body = encodeURIComponent(msg + (email ? '\\n\\nReply to: ' + email : ''));
            window.location.href = 'mailto:support@heavenlease.in?subject=' + subject + '&body=' + body;

            setTimeout(function () {
                if (note) note.textContent = 'Opening your email app to send the message - thank you!';
            }, 400);
        }

const navbar = document.getElementById('navbar');
        const hamburger = document.getElementById('hamburger');
        const navLinks = document.getElementById('navLinks');
        const backToTop = document.getElementById('backToTop');

        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) navbar.classList.add('scrolled');
            else navbar.classList.remove('scrolled');

            if (window.scrollY > 500) backToTop.classList.add('visible');
            else backToTop.classList.remove('visible');
        });

        if (hamburger) hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            if (navLinks) navLinks.classList.toggle('active');
        });

        if (hamburger && navLinks) {
            document.querySelectorAll('.nav-link').forEach(link => {
                link.addEventListener('click', () => {
                    hamburger.classList.remove('active');
                    navLinks.classList.remove('active');
                });
            });
        }

        if (backToTop) {
            backToTop.addEventListener('click', () => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        }
