/* ============================================================
 * HeavenLease — add-property page module
 * Extracted from add-property.html (1 inline block).
 * Removes all inline <script> from the page per project rule.
 * ============================================================ */

const d = window.HL_DEMO_DATA;
const properties = (d && Array.isArray(d.addPropertyGrid)) ? d.addPropertyGrid : [];
let saved=JSON.parse(localStorage.getItem("heavenlease-saved")||"[]");
function render(list=properties){document.getElementById("propertyGrid").innerHTML=list.map((p,i)=>`<article class="card"><div class="pic" style="background-image:url('${p.img}')"><span class="pill">${p.type}</span><button class="heart ${saved.includes(i)?"active":""}" onclick="toggleSave(${i},this)"><i class="${saved.includes(i)?"fa-solid":"fa-regular"} fa-heart"></i></button></div><div class="info"><div class="price">${p.price} <small>${p.unit}</small></div><div class="title">${p.title}</div><div class="loc"><i class="fa-solid fa-location-dot"></i> ${p.loc}</div><div class="meta"><span><i class="fa-solid fa-bed"></i>${p.beds} Beds</span><span><i class="fa-solid fa-bath"></i>${p.baths} Baths</span><span><i class="fa-regular fa-square"></i>${p.size}</span></div></div></article>`).join("")}
function toggleSave(i,el){if(saved.includes(i))saved=saved.filter(x=>x!==i);else saved.push(i);localStorage.setItem("heavenlease-saved",JSON.stringify(saved));el.classList.toggle("active");el.innerHTML=`<i class="${saved.includes(i)?"fa-solid":"fa-regular"} fa-heart"></i>`;toast(saved.includes(i)?"Property saved":"Property removed")}
function searchProperties(){const q=document.getElementById("location").value.toLowerCase();const type=document.getElementById("type").value;const purpose=document.getElementById("purpose").value;let result=properties.filter(p=>(!q||p.loc.toLowerCase().includes(q))&&(!type||p.title.includes(type))&&(!purpose||p.type.toLowerCase().includes(purpose.toLowerCase())));render(result);toast(`${result.length} properties found`);document.getElementById("properties").scrollIntoView({behavior:"smooth"})}
function toast(msg){const t=document.getElementById("toast");t.textContent=msg;t.classList.add("show");clearTimeout(window.__t);window.__t=setTimeout(()=>t.classList.remove("show"),2200)}
render();
