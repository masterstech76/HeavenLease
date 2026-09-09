/* ============================================================
 * HeavenLease — how-it-works page module
 * Extracted from how-it-works.html (1 inline block).
 * Removes all inline <script> from the page per project rule.
 * ============================================================ */

const navbar=document.getElementById("navbar");
const profileBtn=document.getElementById("profileBtn");
const profileDropdown=document.getElementById("profileDropdown");
const backToTop=document.getElementById("backToTop");

window.addEventListener("scroll",()=>{
 navbar.classList.toggle("scrolled",window.scrollY>30);
 backToTop.classList.toggle("visible",window.scrollY>450);
},{passive:true});

profileBtn.addEventListener("click",(e)=>{
 e.stopPropagation();
 const open=profileDropdown.classList.toggle("open");
 profileBtn.setAttribute("aria-expanded",open);
});
document.addEventListener("click",(e)=>{
 if(!e.target.closest(".user-menu")){
  profileDropdown.classList.remove("open");
  profileBtn.setAttribute("aria-expanded","false");
 }
});

document.querySelectorAll(".faq-question").forEach(btn=>{
 btn.addEventListener("click",()=>{
  const item=btn.closest(".faq-item");
  document.querySelectorAll(".faq-item.open").forEach(other=>{
   if(other!==item) other.classList.remove("open");
  });
  item.classList.toggle("open");
 });
});

backToTop.addEventListener("click",()=>window.scrollTo({top:0,behavior:"smooth"}));

document.getElementById("logoutLink").addEventListener("click",(e)=>{
 e.preventDefault();
 profileDropdown.classList.remove("open");
 alert("Logout action is ready to connect to your authentication API.");
});
