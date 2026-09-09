/* ============================================================
 * HeavenLease — buy-sell page module
 * Extracted from buy-sell.html (1 inline block).
 * Removes all inline <script> from the page per project rule.
 * ============================================================ */

const $=s=>document.querySelector(s);
$("#year").textContent=new Date().getFullYear();

function openModal(type){
  $("#modal").classList.add("open");
  $("#journeyForm").style.display="none";
  $("#modalTitle").textContent=type==="sell"?"Sell your property":"Buy a home";
  $("#modalSub").textContent=type==="sell"?"Start with a few basics and continue to listing setup.":"Start with your location and we'll shape the buyer journey.";
}
function closeModal(){$("#modal").classList.remove("open")}
$("#modal").addEventListener("click",e=>{if(e.target.id==="modal")closeModal()});
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeModal()});

function continueJourney(type){
  $("#journeyForm").style.display="block";
  $("#modalTitle").textContent=type==="sell"?"Create your seller profile":"Create your buyer profile";
  $("#modalSub").textContent=type==="sell"?"These details are saved locally for this demo.":"These details are saved locally for this demo.";
  $("#nameLabel").textContent=type==="sell"?"Owner name":"Buyer name";
  $("#detailLabel").textContent=type==="sell"?"Property location":"Preferred location";
  $("#journeyForm").dataset.type=type;
  $("#journeyDetail").placeholder=type==="sell"?"e.g. Nashik, Maharashtra":"e.g. Nashik, Maharashtra";
}
function submitJourney(){
  const name=$("#journeyName").value.trim(),email=$("#journeyEmail").value.trim(),detail=$("#journeyDetail").value.trim(),type=$("#journeyForm").dataset.type;
  if(!name||!email||!detail){toast("Please complete all three fields.");return}
  const data={name,email,detail,type,createdAt:new Date().toISOString()};
  localStorage.setItem("heavenlease_last_intent",JSON.stringify(data));
  closeModal();
  toast(type==="sell"?"Seller journey saved — listing setup can begin next.":"Buyer journey saved — search preferences are ready.");
}

function filterStats(){
  const q=$("#quickSearch").value.trim();
  $("#searchResult").textContent=q?`Ready to search for properties around “${q}”. Connect this field to your listings API for live results.`:"Try a location above to start your search.";
}

$("#helpForm").addEventListener("submit",e=>{
  e.preventDefault();
  const msg=$("#message").value.trim(),email=$("#email").value.trim(),topic=$("#topic").value;
  if(!msg){toast("Please enter a message.");return}
  const subject=encodeURIComponent("HeavenLease support — "+topic);
  const body=encodeURIComponent(msg+(email?"\n\nReply to: "+email:""));
  $("#notice").style.display="block";
  $("#notice").textContent="Opening your email client with the support request.";
  window.location.href=`mailto:support@heavenlease.in?subject=${subject}&body=${body}`;
});

function toast(message){const t=$("#toast");t.textContent=message;t.style.display="block";clearTimeout(window.__toast);window.__toast=setTimeout(()=>t.style.display="none",3000)}
