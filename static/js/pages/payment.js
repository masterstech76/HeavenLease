/* ============================================================
 * HeavenLease — Payment (Access Pass / Owner Plus) module
 * Razorpay order → checkout → verify → success. Plan selection,
 * existing-subscription banner. Extracted from payment.html.
 * Requires js/api.js + js/core.js + Razorpay checkout.js first.
 * ============================================================ */
(function () {
    'use strict';

    const navbar = document.getElementById('navbar');
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.getElementById('navLinks');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) navbar.classList.add('scrolled');
        else navbar.classList.remove('scrolled');
    });
    if (hamburger) hamburger.addEventListener('click', () => { hamburger.classList.toggle('active'); navLinks.classList.toggle('active'); });
    if (hamburger && navLinks) document.querySelectorAll('.nav-link').forEach(link => link.addEventListener('click', () => { hamburger.classList.remove('active'); navLinks.classList.remove('active'); }));

    let selectedPlan = 6, PAYMENT_AMOUNT = 459, AMOUNT_PAISE = 45900, selectedRole = 'tenant';
    let RAZORPAY_KEY = '', razorpayConfigured = false;

    async function loadPaymentConfig() {
        try {
            const rcfg = await api.getPaymentConfig().catch(() => null);
            if (rcfg && rcfg.razorpayConfigured && rcfg.keyId) { RAZORPAY_KEY = rcfg.keyId; razorpayConfigured = true; }
        } catch (e) { /* keep defaults */ }
        if (!razorpayConfigured) { const notice = document.getElementById('payConfigNotice'); if (notice) notice.style.display = 'flex'; }
        updatePlanDisplay();
    }
    loadPaymentConfig();

    const urlParams = new URLSearchParams(window.location.search);
    const urlPlan = parseInt(urlParams.get('plan')), urlAmount = parseInt(urlParams.get('amount')), urlRole = urlParams.get('role') || 'tenant';
    if (urlPlan && [3, 6, 12].includes(urlPlan)) {
        selectedPlan = urlPlan;
        selectedRole = urlRole;
        if (urlAmount) { PAYMENT_AMOUNT = urlAmount; AMOUNT_PAISE = urlAmount * 100; }
        else { const planAmounts = { 3: 299, 6: 459, 12: 799 }; PAYMENT_AMOUNT = planAmounts[urlPlan]; AMOUNT_PAISE = PAYMENT_AMOUNT * 100; }
        document.querySelectorAll('.plan-option').forEach(opt => opt.classList.toggle('selected', parseInt(opt.getAttribute('data-plan')) === urlPlan));
    }

    function updatePlanDisplay() {
        const planNames = { 3: '3-Month', 6: '6-Month', 12: '12-Month' }, roleLabel = selectedRole === 'owner' ? 'Owner Plus' : 'Tenant Access Pass';
        document.getElementById('planDurationLabel').textContent = planNames[selectedPlan] + ' Access Fee';
        document.getElementById('planAmountDisplay').innerHTML = '₹' + PAYMENT_AMOUNT + ' <small>incl. GST</small>';
        document.getElementById('planNameDisplay').textContent = '🗝️ ' + roleLabel + ' · ' + planNames[selectedPlan];
        document.getElementById('payBtnText').textContent = 'Pay ₹' + PAYMENT_AMOUNT + ' Securely';
    }
    updatePlanDisplay();

    window.selectPlan = function (el) {
        document.querySelectorAll('.plan-option').forEach(o => o.classList.remove('selected'));
        el.classList.add('selected');
        selectedPlan = parseInt(el.getAttribute('data-plan'));
        PAYMENT_AMOUNT = parseInt(el.getAttribute('data-amount'));
        AMOUNT_PAISE = PAYMENT_AMOUNT * 100;
        selectedRole = el.getAttribute('data-role') || 'tenant';
        updatePlanDisplay();
window.payNow = async function () {
        if (!razorpayConfigured || !RAZORPAY_KEY || RAZORPAY_KEY.includes('YOUR_KEY')) {
            showToast('Payments are not ready yet — the payment provider is still being set up. Please try again shortly.', 'error');
            return;
        }
        document.getElementById('processingOverlay').classList.add('show');
        try {
            const orderData = await api.createRazorpayOrder(selectedPlan, 'rcpt_' + Date.now(), 'subscription');
            const orderId = orderData.orderId;
            const serverAmount = Number(orderData.amount) || PAYMENT_AMOUNT;
            let user = { name: '', email: '', phone: '' };
            try { const stored = JSON.parse(localStorage.getItem('heavenlease_user') || '{}'); user = Object.assign({}, user, stored); } catch (e) { /* ignore */ }
            const options = {
                key: RAZORPAY_KEY, amount: Math.round(serverAmount * 100), currency: 'INR',
                name: 'HeavenLease', description: 'Access Pass ₹' + serverAmount,
                image: 'https://heavenlease.in/favicon.svg', order_id: orderId,
                handler: function (response) {
                    api.verifyRazorpayPayment({
                        orderId: response.razorpay_order_id,
                        paymentId: response.razorpay_payment_id,
                        signature: response.razorpay_signature,
                        planMonths: String(selectedPlan)
                    }).then(() => completePayment('razorpay', response.razorpay_payment_id)).catch(err => {
                        showToast(err.message || 'Payment verification failed.', 'error');
                        document.getElementById('processingOverlay').classList.remove('show');
                    });
                },
                prefill: { name: user.name || '', email: user.email || '', contact: user.phone || '' },
                theme: { color: '#5b5ce2' }
            };
            const rzp = new Razorpay(options);
            document.getElementById('processingOverlay').classList.remove('show');
            rzp.open();
        } catch (e) {
            document.getElementById('processingOverlay').classList.remove('show');
            showToast('Payment failed. Please try again.', 'error');
        }
    };

    async function completePayment(method, paymentId) {
        document.getElementById('processingOverlay').classList.remove('show');
        document.getElementById('paymentCard').style.display = 'none';
        document.getElementById('successScreen').style.display = 'block';
        document.getElementById('successContent').classList.add('show');
        document.getElementById('paymentIdBox').textContent = 'Payment ID: ' + paymentId + ' · Method: ' + method + ' · Plan: ' + selectedPlan + ' months';
        const successText = document.querySelector('#successContent p');
        if (successText) successText.textContent = 'Your ' + (selectedRole === 'owner' ? 'Owner Plus' : 'Tenant Access Pass') + ' is now active for ' + selectedPlan + ' months.';
        showToast('Payment successful! Your access is now active. 🎉', 'success');
    }

    (async () => {
        try {
            const sub = await api.getSubscription();
            if (sub && sub.active) {
                const alreadyPaid = document.createElement('div');
                alreadyPaid.className = 'already-access';
                alreadyPaid.innerHTML = '<div class="success-icon"><i class="fas fa-check"></i></div><h2>You Already Have Access! 🎉</h2><p>Your Access Pass is active. Go find your perfect home!</p><a href="properties" class="btn btn-primary btn-lg">Browse Properties</a><a href="dashboard" class="btn btn-outline btn-lg">My Dashboard</a>';
                document.querySelector('.payment-layout').insertBefore(alreadyPaid, document.querySelector('.payment-layout>div'));
                document.getElementById('paymentCard').style.display = 'none';
            }
        } catch (e) { /* ignore */ }
    })();
})();
    };