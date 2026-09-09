/* ============================================================
 * HeavenLease — cookies page module
 * Extracted from cookies.html (1 inline block).
 * Removes all inline <script> from the page per project rule.
 * ============================================================ */

const topBtn=document.getElementById('top');
window.addEventListener('scroll',()=>{
 topBtn.classList.toggle('show',window.scrollY>450);
});
topBtn.addEventListener('click',()=>window.scrollTo({top:0,behavior:'smooth'}));

document.getElementById('menuBtn')?.addEventListener('click',()=>{
 const links=document.querySelectorAll('.nav-link');
 const visible=links[0]?.style.display==='block';
 links.forEach(x=>x.style.display=visible?'none':'block');
});
