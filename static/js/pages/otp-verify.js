/* HeavenLease OTP / 2FA verification */
(function () {
    'use strict';
    const params = new URLSearchParams(location.search);
    const mode = params.get('mode');

    if (mode === '2fa') {
        init2fa();
        return;
    }

    try {
        if (localStorage.getItem('heavenlease_token') || sessionStorage.getItem('heavenlease_token')) {
            location.replace('home'); return;
        }
    } catch (e) {}
    const email = params.get('email'), phone = params.get('phone'), redirect = params.get('redirect');
    const target = document.getElementById('otpTarget');
    if (target) target.textContent = email || (phone ? '+91 ' + phone : '');
    window.handleOtpInput = el => { if (el.value.length === 1 && el.nextElementSibling) el.nextElementSibling.focus(); };
    function getOtp() { return Array.from(document.querySelectorAll('#otpInputs .otp-digit')).map(i => i.value).join(''); }
    function countdown() { const b=document.getElementById('resendBtn'); if(!b)return; let n=30;b.disabled=true;b.textContent='Resend in '+n+'s';const t=setInterval(()=>{if(--n<=0){clearInterval(t);b.disabled=false;b.textContent='Resend';}else b.textContent='Resend in '+n+'s';},1000); }
    window.verifyOtp = async function () {
        const code=getOtp(); if(code.length!==6){showToast('Please enter the 6-digit OTP.','error');return;}
        const b=document.getElementById('verifyBtn'); b.disabled=true;
        try { if(email) await api.verifyEmail(email,code); else if(phone) await api.verifySmsOtp(phone,code); else throw new Error('Missing verification target.');
            showToast('OTP verified successfully!','success'); setTimeout(()=>location.replace(redirect||'home'),700);
        } catch(e){showToast(e.message||'Verification failed.','error');} finally{b.disabled=false;}
    };
    window.resendOtp = async function(){try{if(email)await api.sendVerification(email);else if(phone)await api.sendSmsOtp(phone);showToast('OTP resent successfully.','success');countdown();}catch(e){showToast(e.message||'Failed to resend OTP.','error');}};
    countdown();

    async function init2fa() {
        const token=sessionStorage.getItem('heavenlease_2fa_pending');
        if(!token){location.replace('login');return;}
        const emailEnabled=sessionStorage.getItem('heavenlease_2fa_email_enabled')==='1';
        const totpEnabled=sessionStorage.getItem('heavenlease_2fa_totp_enabled')==='1';
        const hint=sessionStorage.getItem('heavenlease_2fa_email_hint')||'';
        const card=document.querySelector('.auth-card');
        if(!card)return;
        card.innerHTML=`<div class="twofa-head"><div class="twofa-icon"><i class="fas fa-shield-halved"></i></div><div><div class="twofa-kicker">HEAVENLEASE SECURITY</div><h1>Verify your sign in</h1><p>Complete one more step to access your account.</p></div></div>
        <div class="twofa-methods">${emailEnabled?'<button class="twofa-method active" id="chooseEmail"><i class="fas fa-envelope"></i><span><b>Email OTP</b><small>'+hint+'</small></span></button>':''}${totpEnabled?'<button class="twofa-method" id="chooseTotp"><i class="fas fa-mobile-screen-button"></i><span><b>Authenticator App</b><small>Use your 6-digit code</small></span></button>':''}</div>
        <section id="twofaEmail" class="twofa-panel" style="display:none"><h2>Email verification</h2><p>We'll send a 6-digit code to your registered email.</p><button class="twofa-primary" id="send2faEmail">Send verification code</button><div id="emailVerifyBox" style="display:none"><label>Verification code</label><input id="twofaEmailCode" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="000000"><button class="twofa-primary" id="verify2faEmail">Verify & continue</button><button class="twofa-link" id="resend2faEmail">Resend code</button></div></section>
        <section id="twofaTotp" class="twofa-panel" style="display:none"><h2>Authenticator verification</h2><p>Open your authenticator app and enter the current 6-digit code.</p><label>Authenticator code</label><input id="twofaTotpCode" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="000000"><button class="twofa-primary" id="verify2faTotp">Verify & continue</button></section>
        <button class="twofa-cancel" id="cancel2fa">Cancel sign in</button>`;
        addStyles();
        const emailPanel=document.getElementById('twofaEmail'), totpPanel=document.getElementById('twofaTotp');
        function select(which){emailPanel.style.display=which==='email'?'block':'none';totpPanel.style.display=which==='totp'?'block':'none';document.querySelectorAll('.twofa-method').forEach(x=>x.classList.remove('active'));document.getElementById(which==='email'?'chooseEmail':'chooseTotp')?.classList.add('active');}
        document.getElementById('chooseEmail')?.addEventListener('click',()=>select('email')); document.getElementById('chooseTotp')?.addEventListener('click',()=>select('totp'));
        if(emailEnabled) select('email'); else select('totp');
        document.getElementById('send2faEmail')?.addEventListener('click',async()=>{const b=document.getElementById('send2faEmail');b.disabled=true;try{await api.send2faEmail(token);document.getElementById('emailVerifyBox').style.display='block';b.style.display='none';showToast('Verification code sent.','success');}catch(e){showToast(e.message||'Could not send code.','error');b.disabled=false;}});
        document.getElementById('verify2faEmail')?.addEventListener('click',()=>finish('email',document.getElementById('twofaEmailCode').value));
        document.getElementById('resend2faEmail')?.addEventListener('click',async()=>{try{await api.send2faEmail(token);showToast('A new code was sent.','success');}catch(e){showToast(e.message||'Could not resend code.','error');}});
        document.getElementById('verify2faTotp')?.addEventListener('click',()=>finish('totp',document.getElementById('twofaTotpCode').value));
        document.getElementById('cancel2fa').addEventListener('click',()=>{sessionStorage.removeItem('heavenlease_2fa_pending');location.replace('login');});
        async function finish(method,code){if(!/^\d{6}$/.test(code)){showToast('Enter the 6-digit code.','error');return;}const b=document.getElementById(method==='email'?'verify2faEmail':'verify2faTotp');b.disabled=true;try{const data=method==='email'?await api.verify2faEmail(token,code):await api.verify2faTotp(token,code);sessionStorage.removeItem('heavenlease_2fa_pending');sessionStorage.removeItem('heavenlease_2fa_email_enabled');sessionStorage.removeItem('heavenlease_2fa_totp_enabled');sessionStorage.removeItem('heavenlease_2fa_email_hint');api.setToken(data.token,true);api.setUser({email:data.email,role:data.role,name:data.fullName||'',id:data.id},true);showToast('Identity verified. Welcome to HeavenLease.','success');setTimeout(()=>location.replace(data.role==='ADMIN'?'admin-dashboard':'dashboard'),500);}catch(e){showToast(e.message||'Verification failed.','error');}finally{b.disabled=false;}}
    }
    function addStyles(){if(document.getElementById('twofaStyles'))return;const s=document.createElement('style');s.id='twofaStyles';s.textContent=`.twofa-head{display:flex;gap:15px;align-items:center;margin-bottom:25px}.twofa-icon{width:48px;height:48px;border-radius:15px;display:grid;place-items:center;background:#e8f5ef;color:#267456;font-size:20px}.twofa-kicker{font-size:10px;font-weight:800;letter-spacing:.12em;color:#4f8b70}.twofa-head h1{margin:3px 0;font-size:25px}.twofa-head p,.twofa-panel p{color:#718078;font-size:13px;line-height:1.6}.twofa-methods{display:grid;gap:10px;margin-bottom:18px}.twofa-method{border:1px solid #dfe8e3;background:#fff;border-radius:15px;padding:14px;text-align:left;display:flex;gap:13px;align-items:center;cursor:pointer}.twofa-method.active{border-color:#4d9274;box-shadow:0 0 0 3px #e8f5ef}.twofa-method>i{color:#2e7d5c;font-size:18px;width:25px;text-align:center}.twofa-method span{display:grid;gap:3px}.twofa-method small{color:#7b8782}.twofa-panel{padding:20px;border-radius:18px;background:#f7faf8;border:1px solid #e2ebe6}.twofa-panel h2{font-size:17px;margin:0}.twofa-panel label{display:block;font-size:12px;font-weight:700;margin:14px 0 7px}.twofa-panel input{width:100%;padding:14px;border:1px solid #d5e1db;border-radius:12px;text-align:center;letter-spacing:.35em;font-size:22px;font-weight:800}.twofa-primary{width:100%;margin-top:14px;border:0;border-radius:12px;padding:13px;background:#287758;color:#fff;font-weight:800;cursor:pointer}.twofa-link,.twofa-cancel{background:none;border:0;color:#287758;font-weight:700;cursor:pointer;margin-top:13px}.twofa-cancel{display:block;margin-left:auto;margin-right:auto;color:#777}`;document.head.appendChild(s);}
})();
