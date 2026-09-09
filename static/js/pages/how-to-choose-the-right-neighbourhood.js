/* ============================================================
 * HeavenLease — how-to-choose-the-right-neighbourhood page module
 * Extracted from how-to-choose-the-right-neighbourhood.html (1 inline block).
 * Removes all inline <script> from the page per project rule.
 * ============================================================ */

const navbar = document.getElementById('navbar');
const accountBtn = document.getElementById('accountBtn');
const accountDropdown = document.getElementById('accountDropdown');
const back = document.getElementById('back');

window.addEventListener('scroll', () => {
 navbar.classList.toggle('scrolled', window.scrollY > 25);
 back.classList.toggle('show', window.scrollY > 450);
}, {passive:true});

accountBtn.addEventListener('click', (e) => {
 e.stopPropagation();
 const open = accountDropdown.classList.toggle('open');
 accountBtn.setAttribute('aria-expanded', String(open));
});
document.addEventListener('click', () => {
 accountDropdown.classList.remove('open');
 accountBtn.setAttribute('aria-expanded','false');
});

document.querySelectorAll('[data-share]').forEach(button => {
 button.addEventListener('click', async () => {
  const url = location.href;
  const title = document.title;
  if(button.dataset.share === 'copy') {
   try {
    await navigator.clipboard.writeText(url);
    const old = button.innerHTML;
    button.innerHTML = '<i class="fas fa-check"></i>';
    setTimeout(() => button.innerHTML = old, 1400);
   } catch(e) {
    alert('Copy is unavailable in this browser. Please copy the page URL manually.');
   }
  } else if(button.dataset.share === 'x') {
   window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent(title) + '&url=' + encodeURIComponent(url), '_blank', 'noopener');
  } else {
   window.open('https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(url), '_blank', 'noopener');
  }
 });
});

back.addEventListener('click', () => window.scrollTo({top:0,behavior:'smooth'}));
