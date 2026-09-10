/* ============================================================
 * HeavenLease — fair-for-everyone page module
 * Extracted from fair-for-everyone.html (1 inline block).
 * Removes all inline <script> from the page per project rule.
 * ============================================================ */

const navbar = document.getElementById('navbar');
    const profileBtn = document.getElementById('profileBtn');
    const dropdown = document.getElementById('profileDropdown');
    const backToTop = document.getElementById('backToTop');
    const toast = document.getElementById('toast');

    // Auth-gate the account menu: when logged out, never show private links —
    // hide the dropdown and turn the trigger into a "Sign In" button instead.
    {
        const hasToken = !!(localStorage.getItem('heavenlease_token') || sessionStorage.getItem('heavenlease_token'));
        if (!hasToken && profileBtn && dropdown) {
            dropdown.style.display = 'none';
            dropdown.classList.remove('open');
            const chevron = profileBtn.querySelector('.fa-chevron-down');
            if (chevron) chevron.style.display = 'none';
            const nameEl = document.getElementById('navUserName') || profileBtn.querySelector('#navUserName');
            if (nameEl) nameEl.textContent = 'Sign In';
            const avatar = profileBtn.querySelector('.user-avatar');
            if (avatar) avatar.style.display = 'none';
            profileBtn.addEventListener('click', (e) => { e.stopPropagation(); e.preventDefault(); window.location.href = 'login'; });
        }
    }

    function showToast(message){
      toast.textContent = message;
      toast.classList.add('show');
      clearTimeout(window.__toastTimer);
      window.__toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
    }

    window.addEventListener('scroll', () => {
      navbar.classList.toggle('scrolled', window.scrollY > 30);
      backToTop.classList.toggle('visible', window.scrollY > 500);
    }, {passive:true});

    profileBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = dropdown.classList.toggle('open');
      profileBtn.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('click', () => {
      dropdown.classList.remove('open');
      profileBtn.setAttribute('aria-expanded','false');
    });
    dropdown.addEventListener('click', e => e.stopPropagation());

    document.getElementById('logoutLink').addEventListener('click', e => {
      e.preventDefault();
      showToast('Logout is ready to connect to your authentication API.');
    });

    backToTop.addEventListener('click', () => window.scrollTo({top:0,behavior:'smooth'}));

    const message = document.getElementById('helpMessage');
    const email = document.getElementById('helpEmail');
    const note = document.getElementById('helpNote');

    document.getElementById('clearHelp').addEventListener('click', () => {
      message.value = '';
      email.value = '';
      note.textContent = 'Messages are prepared for support@heavenlease.in. Nothing is uploaded automatically.';
    });

    document.getElementById('sendHelp').addEventListener('click', () => {
      const msg = message.value.trim();
      const mail = email.value.trim();
      if (!msg) {
        note.textContent = 'Please type a short message first.';
        message.focus();
        return;
      }
      if (mail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
        note.textContent = 'Please enter a valid email address or leave it blank.';
        email.focus();
        return;
      }
      const subject = encodeURIComponent('HeavenLease page enquiry');
      const body = encodeURIComponent(msg + (mail ? '\n\nReply to: ' + mail : ''));
      window.location.href = `mailto:support@heavenlease.in?subject=${subject}&body=${body}`;
      note.textContent = 'Opening your email app to send the message — thank you!';
    });
