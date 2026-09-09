/* ============================================================
 * HeavenLease — maximizing-your-rental-income page module
 * Extracted from maximizing-your-rental-income.html (1 inline block).
 * Removes all inline <script> from the page per project rule.
 * ============================================================ */

(function(){
  const btn=document.getElementById('backToTop');
  const profileBtn=document.getElementById('profileBtn');
  const dropdown=document.getElementById('profileDropdown');
  window.addEventListener('scroll',()=>btn.classList.toggle('show',window.scrollY>450),{passive:true});
  btn.addEventListener('click',()=>window.scrollTo({top:0,behavior:'smooth'}));

  if(profileBtn && dropdown){
    profileBtn.addEventListener('click',e=>{
      e.stopPropagation();
      const open=dropdown.style.display==='block';
      dropdown.style.display=open?'none':'block';
      profileBtn.setAttribute('aria-expanded',String(!open));
    });
    document.addEventListener('click',e=>{
      if(!e.target.closest('#userMenu')){
        dropdown.style.display='none';
        profileBtn.setAttribute('aria-expanded','false');
      }
    });
  }

  const title='Maximizing Your Rental Income — HeavenLease';
  const url=location.href;
  const x=document.getElementById('shareX');
  const li=document.getElementById('shareLinkedIn');
  const copy=document.getElementById('copyLink');

  x?.addEventListener('click',e=>{
    e.preventDefault();
    window.open('https://twitter.com/intent/tweet?text='+encodeURIComponent(title)+'&url='+encodeURIComponent(url),'_blank','noopener,noreferrer');
  });
  li?.addEventListener('click',e=>{
    e.preventDefault();
    window.open('https://www.linkedin.com/sharing/share-offsite/?url='+encodeURIComponent(url),'_blank','noopener,noreferrer');
  });
  copy?.addEventListener('click',async()=>{
    try{
      await navigator.clipboard.writeText(url);
      copy.innerHTML='<i class="fas fa-check"></i>';
      setTimeout(()=>copy.innerHTML='<i class="fas fa-link"></i>',1800);
    }catch{
      const ta=document.createElement('textarea');ta.value=url;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();
      copy.innerHTML='<i class="fas fa-check"></i>';
      setTimeout(()=>copy.innerHTML='<i class="fas fa-link"></i>',1800);
    }
  });
})();
