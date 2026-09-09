/* ============================================================
 * HeavenLease — contact page module
 * Extracted from contact.html (1 inline block).
 * Removes all inline <script> from the page per project rule.
 * ============================================================ */

const navbar=document.getElementById('navbar');
const profileBtn=document.getElementById('profileBtn');
const dropdown=document.getElementById('profileDropdown');
const form=document.getElementById('contactForm');
const status=document.getElementById('status');
const toast=document.getElementById('toast');
const backTop=document.getElementById('backTop');

profileBtn.addEventListener('click',()=>{
 const open=dropdown.classList.toggle('open');
 profileBtn.setAttribute('aria-expanded',open);
});
document.addEventListener('click',e=>{
 if(!e.target.closest('.user-menu'))dropdown.classList.remove('open');
});
window.addEventListener('scroll',()=>{
 backTop.classList.toggle('show',scrollY>500);
});
backTop.addEventListener('click',()=>scrollTo({top:0,behavior:'smooth'}));

function notify(text){
 toast.textContent=text;toast.classList.add('show');
 setTimeout(()=>toast.classList.remove('show'),3200);
}

form.addEventListener('submit',e=>{
 e.preventDefault();
 const name=document.getElementById('name').value.trim();
 const email=document.getElementById('email').value.trim();
 const phone=document.getElementById('phone').value.trim();
 const interest=document.getElementById('interest').value;
 const message=document.getElementById('message').value.trim();
 const btn=document.getElementById('submitBtn');

 if(!name||!email||!message){
  status.className='status show error';status.textContent='Please complete all required fields.';return;
 }
 const record={name,email,phone,interest,message,submittedAt:new Date().toISOString()};
 localStorage.setItem('heavenlease_contact_last',JSON.stringify(record));

 btn.disabled=true;btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> Preparing...';
 const subject=encodeURIComponent('Contact inquiry from '+name);
 const body=encodeURIComponent(
  'Name: '+name+'\nEmail: '+email+'\nPhone: '+(phone||'Not provided')+
  '\nInterest: '+interest+'\n\nMessage:\n'+message
 );
 setTimeout(()=>{
  window.location.href='mailto:support@heavenlease.in?subject='+subject+'&body='+body;
  status.className='status show success';
  status.textContent='Your email app is opening with your message prepared.';
  form.reset();btn.disabled=false;
  btn.innerHTML='<i class="fas fa-paper-plane"></i> Send Message';
  notify('Message prepared successfully.');
 },450);
});

try{
 const user=JSON.parse(localStorage.getItem('heavenlease_user')||'null');
 if(user){
  document.getElementById('navUserName').textContent=user.name||user.email||'Account';
  document.getElementById('signInLink').style.display='none';
  document.getElementById('logoutLink').style.display='flex';
 }
}catch(e){}
document.getElementById('logoutLink').addEventListener('click',e=>{
 e.preventDefault();localStorage.removeItem('heavenlease_user');location.reload();
});
