/* ============================================================
 * HeavenLease — identity-verification page module
 * Extracted from identity-verification.html (1 inline block).
 * Removes all inline <script> from the page per project rule.
 * ============================================================ */

const navbar=document.getElementById('navbar'), accountBtn=document.getElementById('accountBtn'),
accountDropdown=document.getElementById('accountDropdown'), back=document.getElementById('back');

window.addEventListener('scroll',()=>{
 navbar.classList.toggle('scrolled',scrollY>25);
 back.classList.toggle('show',scrollY>450);
},{passive:true});

accountBtn.addEventListener('click',e=>{
 e.stopPropagation(); const open=accountDropdown.classList.toggle('open');
 accountBtn.setAttribute('aria-expanded',String(open));
});
document.addEventListener('click',()=>{
 accountDropdown.classList.remove('open');accountBtn.setAttribute('aria-expanded','false');
});

document.getElementById('verifyBtn').addEventListener('click',()=>{
 const name=document.getElementById('docName').value.trim();
 const number=document.getElementById('docNumber').value.trim();
 const type=document.getElementById('docType').value;
 const status=document.getElementById('verifyStatus');
 status.classList.add('show');
 if(!name || !number) {
  status.textContent='Please enter the document name and document number to continue.';
  return;
 }
 const masked=number.length>4 ? '••••' + number.slice(-4) : '••••';
 status.textContent=`Verification request prepared for ${name} using ${type} (${masked}). Connect this button to your secure verification service for production use.`;
});
document.getElementById('resetBtn').addEventListener('click',()=>{
 document.getElementById('docName').value='';
 document.getElementById('docNumber').value='';
 document.getElementById('verifyStatus').classList.remove('show');
});

document.getElementById('helpClear').addEventListener('click',()=>{
 document.getElementById('helpMessage').value='';document.getElementById('helpEmail').value='';
});
document.getElementById('helpSend').addEventListener('click',()=>{
 const msg=document.getElementById('helpMessage').value.trim();
 const email=document.getElementById('helpEmail').value.trim();
 const note=document.getElementById('helpNote');
 if(!msg){note.textContent='Please type a short message first.';return;}
 const body=encodeURIComponent(msg+(email?'\n\nReply to: '+email:''));
 window.location.href='mailto:support@heavenlease.in?subject=HeavenLease%20Identity%20Verification%20Enquiry&body='+body;
 note.textContent='Opening your email app to send the message.';
});
back.addEventListener('click',()=>scrollTo({top:0,behavior:'smooth'}));
