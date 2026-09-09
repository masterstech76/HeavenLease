/* ============================================================
 * HeavenLease — terms page module
 * Extracted from terms.html (1 inline block).
 * Removes all inline <script> from the page per project rule.
 * ============================================================ */

const navbar=document.getElementById('navbar');
const hamburger=document.getElementById('hamburger');
const navLinks=document.getElementById('navLinks');
const backToTop=document.getElementById('backToTop');
window.addEventListener('scroll',()=>{
  if(window.scrollY>50) navbar.classList.add('scrolled'); else navbar.classList.remove('scrolled');
  if(window.scrollY>500) backToTop.classList.add('visible'); else backToTop.classList.remove('visible');
});
if(hamburger) hamburger.addEventListener('click',()=>{
  hamburger.classList.toggle('active');
  if(navLinks) navLinks.classList.toggle('active');
});
if(hamburger&&navLinks) document.querySelectorAll('.nav-link').forEach(link=>link.addEventListener('click',()=>{
  hamburger.classList.remove('active');navLinks.classList.remove('active');
}));
backToTop.addEventListener('click',()=>window.scrollTo({top:0,behavior:'smooth'}));
