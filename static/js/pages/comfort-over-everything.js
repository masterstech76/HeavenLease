/* ============================================================
 * HeavenLease — comfort-over-everything page module
 * Extracted from comfort-over-everything.html (1 inline block).
 * Removes all inline <script> from the page per project rule.
 * ============================================================ */

const $ = id => document.getElementById(id);

window.addEventListener('scroll', () => {
  $('navbar').classList.toggle('scrolled', scrollY > 20);
  $('back').classList.toggle('show', scrollY > 500);
});
$('back').onclick = () => scrollTo({top:0,behavior:'smooth'});
$('menuBtn').onclick = () => $('navLinks').classList.toggle('open');
document.querySelectorAll('#navLinks a').forEach(a => a.onclick = () => $('navLinks').classList.remove('open'));

const dims = ['sun','quiet','commute','pet'];
function updateScores(){
  const values = dims.map(id => +$(id).value);
  const score = Math.round(values.reduce((a,b)=>a+b,0)/values.length);
  $('totalScore').textContent = score;
  dims.forEach((id,i)=>{
    $(id+'Out').value = values[i];
    $(id+'Val').textContent = values[i];
    $(id+'Bar').style.width = values[i]+'%';
  });
  localStorage.setItem('heavenlease_comfort_demo', JSON.stringify(values));
}
dims.forEach(id => $(id).addEventListener('input', updateScores));
try{
  const saved = JSON.parse(localStorage.getItem('heavenlease_comfort_demo'));
  if(Array.isArray(saved) && saved.length===4) dims.forEach((id,i)=>$(id).value=saved[i]);
}catch(e){}
updateScores();

function toast(message){
  $('toast').textContent=message;
  $('toast').classList.add('show');
  setTimeout(()=>$('toast').classList.remove('show'),2600);
}
$('clearBtn').onclick=()=>{
  $('helpMessage').value='';
  $('helpEmail').value='';
  $('helpNote').textContent='This front-end demo opens your email app; it does not silently transmit your message.';
};
$('sendBtn').onclick=()=>{
  const msg=$('helpMessage').value.trim();
  const email=$('helpEmail').value.trim();
  if(!msg){ $('helpNote').textContent='Please type a short message first.'; return; }
  const subject=encodeURIComponent('HeavenLease Comfort Score enquiry');
  const body=encodeURIComponent(msg+(email?'\n\nReply to: '+email:''));
  $('helpNote').textContent='Opening your email app with a ready-to-send message…';
  window.location.href='mailto:support@heavenlease.in?subject='+subject+'&body='+body;
  toast('Email draft prepared');
};
