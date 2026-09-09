/* ============================================================
 * HeavenLease — owner-dashboard page module
 * Extracted from owner-dashboard.html (1 inline block).
 * Removes all inline <script> from the page per project rule.
 * ============================================================ */

document.addEventListener('DOMContentLoaded',function(){
    /* Delay navigation long enough for the redirect page to render visibly. */
    setTimeout(function(){ window.location.replace('dashboard'); },1800);
});
