/* ============================================================
 * HeavenLease — careers page module
 * Extracted from careers.html (1 inline block).
 * Removes all inline <script> from the page per project rule.
 * ============================================================ */

const d = window.HL_DEMO_DATA;
const roles = (d && Array.isArray(d.careersJobs)) ? d.careersJobs : [];
const $=s=>document.querySelector(s);$("#year").textContent=new Date().getFullYear();

function renderJobs(list=roles){
 const grid=$("#jobGrid");grid.innerHTML="";
 list.forEach((r,i)=>{const el=document.createElement("article");el.className="job";el.innerHTML=`
 <div class="job-top"><div><h3>${r.name}</h3><span class="job-type">${r.team} · ${r.location} · ${r.type}</span></div><span style="font-size:20px">↗</span></div>
 <div class="job-meta"><span class="chip">${r.team}</span><span class="chip">${r.location}</span><span class="chip">${r.type}</span></div>
 <p>${r.desc}</p><button class="btn outline apply" onclick="openApply(${i})">Apply now →</button>`;grid.appendChild(el)});
 $("#count").textContent=`${list.length} opening${list.length===1?"":"s"}`;$("#empty").style.display=list.length?"none":"block";
}
function filterJobs(){
 const q=$("#search").value.toLowerCase().trim(),t=$("#type").value,l=$("#location").value;
 const list=roles.filter(r=>(!q||[r.name,r.team,r.location,r.type,r.desc].join(" ").toLowerCase().includes(q))&&(!t||r.type===t)&&(!l||r.location.includes(l)));
 renderJobs(list);
}
function scrollToJobs(){$("#jobs").scrollIntoView({behavior:"smooth"})}
function openApply(i){openModal(roles[i].name)}
function openGeneral(){openModal("General application")}
function openModal(roleName){
 $("#modal").classList.add("open");$("#success").style.display="none";
 const sel=$("#role");sel.innerHTML=roles.map(r=>`<option>${r.name}</option>`).join("");
 if(roleName!=="General application")sel.value=roleName;
 else {const o=document.createElement("option");o.textContent="General application";o.selected=true;sel.prepend(o)}
 $("#modalTitle").textContent=roleName==="General application"?"Introduce yourself":"Apply: "+roleName;
}
function closeModal(){$("#modal").classList.remove("open")}
$("#modal").addEventListener("click",e=>{if(e.target.id==="modal")closeModal()});
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeModal()});

$("#applyForm").addEventListener("submit",e=>{
 e.preventDefault();
 const role=$("#role").value,name=$("#name").value.trim(),email=$("#email").value.trim(),phone=$("#phone").value.trim(),url=$("#url").value.trim(),message=$("#message").value.trim();
 const payload={role,name,email,phone,url,message,createdAt:new Date().toISOString()};
 localStorage.setItem("heavenlease_career_application",JSON.stringify(payload));
 const subject=encodeURIComponent("Career application — "+role);
 const body=encodeURIComponent(`Role: ${role}\nName: ${name}\nEmail: ${email}${phone?"\nPhone: "+phone:""}${url?"\nProfile: "+url:""}${message?"\n\nIntroduction:\n"+message:""}`);
 $("#success").style.display="block";$("#success").textContent="Your application details are saved locally and an email draft will open.";
 window.location.href=`mailto:support@heavenlease.in?subject=${subject}&body=${body}`;
});

renderJobs();
