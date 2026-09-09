/* ============================================================
 * HeavenLease — FAQ page module
 * FAQ bank + live search + accordion (one-open-at-a-time).
 * Extracted from faq.html. Requires js/api.js + js/core.js.
 * ============================================================ */
(function () {
    'use strict';

    /* ===== FAQ data ===== */
    const FAQS = [
        ['How do I find a rental?', 'Browse <a href="properties">properties</a>, filter by location, budget and comfort scores, then request a tour or contact the owner directly.'],
        ['What is the Access Pass?', 'The Access Pass is a paid subscription that unlocks owner contact details and premium features via <a href="payment">Payments</a>. It is verified server-side after payment.'],
        ['How are security deposits protected?', 'Deposits paid through <a href="escrow-policy">escrow</a> are held securely until you move in and verify the property condition, then released to the owner.'],
        ['How do I list my property?', 'As an owner, go to <a href="list-property">List Your Property</a>, fill in the details, and publish. Manage it anytime from <a href="properties-management">Properties Management</a>.'],
        ['Do I need to pay a broker?', 'No. HeavenLease is broker-free — tenants and owners connect directly, saving up to one month of rent in brokerage.'],
        ['How are owners verified?', 'Owners complete identity verification via the <a href="owner-verify">owner verification</a> flow. Verified owners get a badge on their listings.'],
        ['Can I talk to the owner before visiting?', 'Yes — use in-app <a href="messages">messages</a> to chat, or request a tour. Your phone number stays private until you choose to share it.'],
        ['What payments are accepted?', 'Razorpay powers UPI, cards and net-banking for Access Pass, upgrades and escrow deposits.'],
        ['How do maintenance requests work?', 'Tenants raise a request from <a href="maintenance-request">Maintenance</a>; owners see it in their queue and can start, complete or cancel it. Status updates arrive as notifications.'],
        ['How do I contact support?', 'Open a <a href="support-tickets">support ticket</a> or use the <a href="contact">contact</a> page. Our team reviews reports and helps with payments, verification and disputes.'],
        ['What are comfort scores?', 'Comfort scores rate each property on quietness, sunlight, commute and pet-friendliness. Compare them on <a href="comfort-scores">Comfort Scores</a> or the <a href="properties">properties</a> page to pick a home that fits your lifestyle.'],
        ['How do I compare properties?', 'Use the <a href="property-compare">Property Compare</a> tool to view up to three listings side by side — rent, deposit, BHK, amenities and comfort scores.'],
        ['How do I save a property?', 'Open any property card and click the heart icon, or open the listing and press Save. All saved homes appear on <a href="saved-properties">Saved Properties</a>.'],
        ['How does lease signing work?', 'Once an owner approves your application, a digital lease is generated. Review the terms on <a href="lease-signing">Lease Signing</a>, e-sign, and both parties get a copy.'],
        ['What is tenant screening?', 'Owners can request identity, employment, credit and background documents through <a href="tenant-screening">Tenant Screening</a>. Documents are stored securely and verified by the owner or an admin.'],
        ['How does rent collection work?', 'Owners track and confirm monthly rent from the <a href="rent-collection">Rent Collection</a> page. Tenants see a full history in <a href="transaction-history">Transaction History</a>.'],
        ['How do notifications work?', 'You receive real-time alerts for tours, applications, maintenance, documents and payments. Manage preferences in <a href="notification-settings">Notification Settings</a>.'],
        ['How do I report a problem?', 'Use <a href="report-property">Report a Property</a> or <a href="report-user">Report a User</a> to flag listings or users. Reports go to moderation and your ticket stays visible in <a href="support-tickets">Support Tickets</a>.'],
        ['Can I upgrade my owner plan?', 'Yes — visit <a href="payment">Upgrade Plan</a> to compare Owner Plus benefits and upgrade securely via Razorpay. Payments reflect instantly in your dashboard.'],
        ['How do I book a tour?', 'Open a property and pick a slot on <a href="tour-booking">Tour Booking</a>. The owner gets a notification and can confirm, decline or reschedule.'],
        ['What does the credit score check include?', 'The <a href="credit-score-check">credit check</a> uploads your credit report for owner review. It is stored privately and only shared with the reviewer you authorise.'],
        ['Is there a background check?', 'Yes — the <a href="background-check">background check</a> lets owners respectably verify police records and ID via document upload, reviewed in the verification panel.'],
        ['Can I buy or sell on HeavenLease?', 'Yes. Listings marked <em>For Sale</em> are searchable, and the <a href="buy-sell">Buy / Sell</a> hub explains the process — deeds, escrow and handover included.']
    ];

    /* ===== Render + search ===== */
    const list = document.getElementById('faqList');
    if (list) {
        function render(filter) {
            const f = (filter || '').toLowerCase().trim();
            const items = FAQS.filter(function (q) { return !f || q[0].toLowerCase().includes(f) || q[1].toLowerCase().includes(f); });
            if (items.length === 0) { list.innerHTML = '<div style="text-align:center;padding:40px;color:var(--gray-500);">No matching questions. Open a <a href="support-tickets">support ticket</a> instead.</div>'; return; }
            list.innerHTML = items.map(function (q) {
                return '<details style="background:var(--white);border:1px solid var(--gray-200);border-radius:var(--radius-lg);padding:18px 22px;margin-bottom:10px;box-shadow:var(--shadow-sm);">'
                    + '<summary style="cursor:pointer;font-weight:600;color:var(--dark);font-size:15px;">' + api.escapeHtml(q[0]) + '</summary>'
                    + '<p style="color:var(--gray-500);line-height:1.7;margin:12px 0 0;">' + q[1] + '</p></details>';
            }).join('');
        }
        const searchEl = document.getElementById('faqSearch');
        if (searchEl) {
            searchEl.addEventListener('input', function () { render(this.value); });
            searchEl.setAttribute('aria-label', 'Search frequently asked questions');
            searchEl.setAttribute('autocomplete', 'off');
        }
        render();
    }

    /* ===== Navbar scroll ===== */
    const nav = document.getElementById('navbar');
    if (nav) {
        const update = () => nav.classList.toggle('scrolled', window.scrollY > 8);
        update();
        window.addEventListener('scroll', update, { passive: true });
    }

    /* ===== One-open-at-a-time accordion ===== */
    if (list) {
        list.addEventListener('toggle', function (e) {
            if (e.target.tagName !== 'DETAILS' || !e.target.open) return;
            list.querySelectorAll('details[open]').forEach(function (d) {
                if (d !== e.target) d.removeAttribute('open');
            });
        }, true);
    }
})();