/* ============================================================
 * HeavenLease — possession page module
 * Extracted from possession.html (1 inline block).
 * Removes all inline <script> from the page per project rule.
 * ============================================================ */

function clearHelpMessage() {
 var msg=document.getElementById('helpMessage'); if(msg) msg.value='';
 var em=document.getElementById('helpEmail'); if(em) em.value='';
 var note=document.getElementById('helpNote'); if(note) note.textContent='Messages go to our support team by email. Prefer email? Write to support@heavenlease.in';
}
function sendHelpMessage() {
 var msgEl=document.getElementById('helpMessage'), msg=(msgEl&&msgEl.value||'').trim();
 var em=document.getElementById('helpEmail'), email=(em&&em.value||'').trim();
 var note=document.getElementById('helpNote');
 if(!msg){if(note) note.textContent='Please type a short message first.';return;}
 var subject=encodeURIComponent('HeavenLease page enquiry');
 var body=encodeURIComponent(msg+(email?'\n\nReply to: '+email:''));
 window.location.href='mailto:support@heavenlease.in?subject='+subject+'&body='+body;
 setTimeout(function(){if(note) note.textContent='Opening your email app to send the message - thank you!';},400);
}
