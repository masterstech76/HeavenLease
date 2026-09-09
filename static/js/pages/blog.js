/* ============================================================
 * HeavenLease — blog page module
 * Extracted from blog.html (1 inline block).
 * Removes all inline <script> from the page per project rule.
 * ============================================================ */

(function(){
 const navbar=document.getElementById('navbar'), profileBtn=document.getElementById('profileBtn'), dropdown=document.getElementById('profileDropdown'), topBtn=document.getElementById('backToTop');
 const modal=document.getElementById('blogModal'), grid=document.getElementById('blogGrid');
 const BLOG_KEY='heavenlease_blogs';

 function scrollUI(){
  navbar.classList.toggle('scrolled',window.scrollY>18);
  topBtn.classList.toggle('show',window.scrollY>500);
 }
 window.addEventListener('scroll',scrollUI,{passive:true});scrollUI();

 profileBtn.addEventListener('click',e=>{e.stopPropagation();dropdown.classList.toggle('open')});
 document.addEventListener('click',()=>dropdown.classList.remove('open'));
 topBtn.addEventListener('click',()=>window.scrollTo({top:0,behavior:'smooth'}));

 try{
  const u=JSON.parse(localStorage.getItem('heavenlease_user')||'null');
  const name=u&&(u.name||u.fullName||u.username);
  if(name) document.getElementById('navUserName').textContent=name.split(' ')[0];
 }catch(e){}

 function load(){try{return JSON.parse(localStorage.getItem(BLOG_KEY)||'[]')}catch(e){return[]}}
 function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
 function card(b){
  const icon=esc((b.icon||'fa-file-lines').trim()),slug=encodeURIComponent((b.slug||('blog-'+Date.now())).trim());
  return `<article class="blog-card"><div class="blog-image"><i class="fas ${icon}"></i></div><div class="blog-body"><span class="blog-tag">${esc(b.tag||'Blog')}</span><h3>${esc(b.title||'Untitled')}</h3><p>${esc(b.summary||'A new HeavenLease blog post.')}</p><span class="blog-meta">${esc(b.date||'Recently')} · New post</span><a class="read-link" href="blog-detail?slug=${slug}">Read article <i class="fas fa-arrow-right"></i></a></div></article>`;
 }
 load().forEach(b=>grid.insertAdjacentHTML('beforeend',card(b)));

 const open=()=>modal.classList.add('show'), close=()=>modal.classList.remove('show');
 document.getElementById('addBlogBtn').addEventListener('click',open);
 document.getElementById('cancelBlogBtn').addEventListener('click',close);
 document.getElementById('closeBlogBtn').addEventListener('click',close);
 modal.addEventListener('click',e=>{if(e.target===modal)close()});

 document.getElementById('saveBlogBtn').addEventListener('click',()=>{
  const title=document.getElementById('blogTitle').value.trim(),tag=document.getElementById('blogTag').value;
  const summary=document.getElementById('blogSummary').value.trim(),body=document.getElementById('blogBody').value.trim();
  const icon=document.getElementById('blogIcon').value.trim();
  let slug=document.getElementById('blogSlug').value.trim().toLowerCase();
  if(!title){alert('Please enter a blog title.');return}
  if(!slug)slug=title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
  const blogs=load(),date=new Date().toLocaleDateString('en-IN',{month:'short',day:'numeric',year:'numeric'});
  const item={slug,title,tag,summary:summary||'A new HeavenLease blog post.',body,icon,date};
  blogs.push(item);localStorage.setItem(BLOG_KEY,JSON.stringify(blogs));grid.insertAdjacentHTML('beforeend',card(item));
  ['blogSlug','blogTitle','blogSummary','blogBody','blogIcon'].forEach(id=>document.getElementById(id).value='');close();
 });
})();
