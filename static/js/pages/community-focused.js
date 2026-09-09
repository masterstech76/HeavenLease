/* ============================================================
 * HeavenLease — community-focused page module
 * Extracted from community-focused.html (1 inline block).
 * Removes all inline <script> from the page per project rule.
 * ============================================================ */

const $=id=>document.getElementById(id);

window.addEventListener('scroll',()=>{
  $('navbar').classList.toggle('scrolled',scrollY>20);
  $('back').classList.toggle('show',scrollY>500);
});
$('back').onclick=()=>scrollTo({top:0,behavior:'smooth'});
$('menuBtn').onclick=()=>$('navLinks').classList.toggle('open');
document.querySelectorAll('#navLinks a').forEach(a=>a.onclick=()=>$('navLinks').classList.remove('open'));

function toast(msg){
  $('toast').textContent=msg;
  $('toast').classList.add('show');
  setTimeout(()=>$('toast').classList.remove('show'),2300);
}
document.querySelectorAll('.serviceBtn').forEach(btn=>{
  btn.onclick=()=>{
    const service=btn.dataset.service;
    $('helpMessage').value=`Hi HeavenLease, I would like more information about ${service}.`;
    document.querySelector('#help').scrollIntoView({behavior:'smooth'});
    $('helpMessage').focus();
    toast(service+' added to your message');
  };
});

$('clearBtn').onclick=()=>{
  $('helpMessage').value='';
  $('helpEmail').value='';
  $('helpNote').textContent='This front-end demo opens your email app; it does not silently transmit your message.';
};
$('sendBtn').onclick=()=>{
  const msg=$('helpMessage').value.trim();
  const email=$('helpEmail').value.trim();
  if(!msg){
    $('helpNote').textContent='Please type a short message first.';
    return;
  }
  const subject=encodeURIComponent('HeavenLease Community enquiry');
  const body=encodeURIComponent(msg+(email?'\n\nReply to: '+email:''));
  $('helpNote').textContent='Opening your email app with a ready-to-send message…';
  window.location.href='mailto:support@heavenlease.in?subject='+subject+'&body='+body;
};
