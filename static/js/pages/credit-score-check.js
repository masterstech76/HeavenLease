/* ============================================================
 * HeavenLease — credit-score-check page module
 * Extracted from credit-score-check.html (1 inline block).
 * Removes all inline <script> from the page per project rule.
 * ============================================================ */

const topBtn=document.getElementById('top');
window.addEventListener('scroll',()=>topBtn.classList.toggle('visible',scrollY>450));
topBtn.addEventListener('click',()=>scrollTo({top:0,behavior:'smooth'}));

document.getElementById('menu').addEventListener('click',()=>{
 document.querySelectorAll('.nav-link').forEach(x=>{
  x.style.display=x.style.display==='block'?'none':'block';
 });
});

const msg=document.getElementById('helpMessage');
const email=document.getElementById('helpEmail');
const note=document.getElementById('note');

document.getElementById('clear').addEventListener('click',()=>{
 msg.value='';email.value='';
 note.textContent='Messages go to our support team by email. Prefer email? support@heavenlease.in';
});

document.getElementById('send').addEventListener('click',()=>{
 const text=msg.value.trim();
 if(!text){note.textContent='Please type a short message first.';return}
 const subject=encodeURIComponent('HeavenLease Credit Score Check Enquiry');
 const body=encodeURIComponent(text+(email.value.trim()?'\n\nReply to: '+email.value.trim():''));
 window.location.href='mailto:support@heavenlease.in?subject='+subject+'&body='+body;
 note.textContent='Opening your email app to send the message — thank you!';
});
