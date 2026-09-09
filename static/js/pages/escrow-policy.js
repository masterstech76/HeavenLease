/* ============================================================
 * HeavenLease — escrow-policy page module
 * Extracted from escrow-policy.html (2 inline blocks).
 * Removes all inline <script> from the page per project rule.
 * ============================================================ */

(function(){
            const navbar=document.getElementById('navbar');
            const backToTop=document.getElementById('backToTop');

            window.addEventListener('scroll',function(){
                if(navbar){
                    if(window.scrollY>50) navbar.classList.add('scrolled');
                    else navbar.classList.remove('scrolled');
                }
                if(backToTop){
                    if(window.scrollY>500) backToTop.classList.add('visible');
                    else backToTop.classList.remove('visible');
                }
            });

            if(backToTop){
                backToTop.addEventListener('click',function(){
                    window.scrollTo({top:0,behavior:'smooth'});
                });
            }
        })();

(function(){
  const nav=document.getElementById('navbar');
  const top=document.getElementById('backToTop');
  window.addEventListener('scroll',()=>{
    nav && nav.classList.toggle('scrolled',window.scrollY>45);
    top && top.classList.toggle('visible',window.scrollY>450);
  },{passive:true});
  document.querySelectorAll('.ep-toc a').forEach(a=>{
    a.addEventListener('click',()=>{
      document.querySelectorAll('.ep-toc a').forEach(x=>x.removeAttribute('aria-current'));
      a.setAttribute('aria-current','page');
    });
  });
})();
