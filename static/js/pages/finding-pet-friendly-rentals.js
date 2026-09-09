/* ============================================================
 * HeavenLease — finding-pet-friendly-rentals page module
 * Extracted from finding-pet-friendly-rentals.html (1 inline block).
 * Removes all inline <script> from the page per project rule.
 * ============================================================ */

(() => {
  // Make the share buttons work even if browser clipboard permissions are limited.
  const copyBtn = document.querySelector('.share-btn[aria-label="Copy link"]');
  if (copyBtn) {
    copyBtn.addEventListener('click', async (event) => {
      event.preventDefault();
      try {
        await navigator.clipboard.writeText(location.href);
      } catch {
        const input = document.createElement('input');
        input.value = location.href;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        input.remove();
      }
      copyBtn.innerHTML = '<i class="fas fa-check"></i>';
      setTimeout(() => copyBtn.innerHTML = '<i class="fas fa-link"></i>', 1800);
    });
  }

  // Native share where supported; otherwise the existing social buttons remain available.
  const meta = document.querySelector('.article-header .meta');
  if (meta && navigator.share) {
    const share = document.createElement('button');
    share.className = 'share-btn';
    share.type = 'button';
    share.setAttribute('aria-label','Share article');
    share.innerHTML = '<i class="fas fa-share-nodes"></i>';
    share.onclick = () => navigator.share({
      title: document.title,
      text: document.querySelector('.article-header h1')?.textContent || document.title,
      url: location.href
    });
    document.querySelector('.share-row')?.appendChild(share);
  }
})();
