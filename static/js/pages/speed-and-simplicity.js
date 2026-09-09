/* ============================================================
 * HeavenLease — speed-and-simplicity page module
 * Extracted from speed-and-simplicity.html (2 inline blocks).
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
        if (hamburger) hamburger.addEventListener('click', () => { hamburger.classList.toggle('active'); navLinks.classList.toggle('active'); });
        document.querySelectorAll('.nav-link').forEach(link => link.addEventListener('click', () => { hamburger.classList.remove('active'); navLinks.classList.remove('active'); }));
        backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

function clearHelpMessage() {
            document.getElementById('helpMessage').value = '';
            document.getElementById('helpEmail').value = '';
            const note = document.getElementById('helpNote');
            if (note) note.textContent = 'Messages go to our support team by email. Prefer email? Write to support@heavenlease.in';
        }
        function sendHelpMessage() {
            const msg = (document.getElementById('helpMessage').value || '').trim();
            const email = (document.getElementById('helpEmail').value || '').trim();
            const note = document.getElementById('helpNote');
            if (!msg) {
                if (note) note.textContent = 'Please type a short message first.';
                return;
            }
            const subject = encodeURIComponent('HeavenLease page enquiry');
            const body = encodeURIComponent(msg + (email ? '\n\nReply to: ' + email : ''));
            window.location.href = 'mailto:support@heavenlease.in?subject=' + subject + '&body=' + body;
            setTimeout(function () {
                if (note) note.textContent = 'Opening your email app to send the message - thank you!';
            }, 400);
        }
