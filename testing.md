# HeavenLease — Final Project Summary

> HeavenLease is a full-stack, broker-free rental platform for India. Tenants
> find and rent homes directly from verified owners; owners manage listings,
> applications, leases, rent and maintenance — all online.

## Quick stats

| Area | Summary |
|---|---|
| Frontend | 97 static HTML pages in `static/` + shared `styles.css`, `script.js` + `api.js` helpers |
| Backend | Spring Boot 3.3.2 (Java 17, Maven) — 20 REST controllers, 14 services, 95 Java files |
| Database | AWS RDS PostgreSQL (prod, no local DB) · H2 in-memory (tests) · DynamoDB (counters) |
| Auth | JWT + BCrypt · email OTP (SES) · self-hosted phone OTP · Google login · reCAPTCHA · login rate-limits |
| Payments | Razorpay (UPI/cards/netbanking) — Tenant Access & Owner Plus plans · escrow deposit flow · invoices |
| Realtime | STOMP WebSocket at `/ws` for chat + in-app notification bell |
| Deploy | Docker Compose + nginx (HTTPS, clean URLs, SPA-less static pages) on EC2 → https://heavenlease.in |

## Backend modules (features overview)

- **Auth `/api/auth`** — login (email/phone/OTP/Google), tenant+owner signup (BCrypt),
  forgot/reset password, `/me` profile, reCAPTCHA + login-attempt lockout.
- **Accounts & users `/api/users`** — profile edit/save (username, bio, avatar, website, phone),
  role-based access (TENANT / OWNER / ADMIN / VERIFIED_OWNER).
- **Properties `/api/properties`** — CRUD listings, search/filter (comfort, budget, location),
  favorites, compare, contact-owner gating.
- **Bookings `/api/bookings`** — property tour scheduling + confirmation.
- **Applications & leases `/api/applications` + `/api/leases`** — rental applications,
  owner review, lease creation, e-signing, renewal reminders (7-day scheduler).
- **Payments `/api/payments`** — Razorpay checkout, server-side signature verify, Access Pass
  / subscription grants, invoices, payment methods, upgrade flows.
- **Escrow** — deposit recorded → ADMIN hold → two-party release or dispute → admin resolve.
- **Maintenance `/api/maintenance`** — tenant request → owner queue (Start/Done/Cancel), status
  notifications.
- **Messaging `/api/messages` + WebSocket** — direct chat, instant delivery via STOMP `/topic/messages`.
- **Notifications `/api/notifications`** — in-app bell (tours, leases, payments, listings, reminders).
- **Documents `/api/documents`** — upload/store/organize (IDs, leases, invoices).
- **Support `/api/tickets`** — support tickets, feedback, reports (property/user).
- **Owner verification `/api/owner-applications`** — multi-step owner identity verification.
- **Integrations `/api/integrations` + `/api/public/config`** — Google, reCAPTCHA, Razorpay keys (admin-only).
- **Ops** — health `/api/health`, stats `/api/stats`, rate limiting, CSP/security headers, AWS SES/SNS/DynamoDB/RDS-IAM.

---

## Complete static site — all 97 pages (features & functionality)
### A. Home, marketing & content pages (21)

#### 404.html — Page Not Found
1. Branded 404 error page served by nginx for any unknown/deleted URL (SEO-safe).
2. Guides visitors back to the homepage instead of a dead end.
3. Doubles as nginx custom `error_page` on the clean `/404` route.

#### about.html — About Us
1. Mission & story — making renting simple, direct and broker-free.
2. Value propositions for tenants and owners (verified listings, no fees).
3. CTA links to how-it-works, contact and careers.

#### blog.html — Blog
1. Blog index of articles on renting, property management and comfort living.
2. Article cards with titles/descriptions; links into individual posts.
3. SEO meta complete; feeds the marketing content pipeline.

#### blog-detail.html — Blog Article
1. Full single-article template: headings, images, prose layout.
2. Showcases a typical blog post with share/related-article affordances.
3. Detail page linked from every blog card.

#### careers.html — Careers
1. "Join the team" pitch plus open roles.
2. Culture/benefits sections build employer brand.
3. Application/contact entry points for candidates.

#### comfort-over-everything.html — Comfort Over Everything
1. Deep explainer of how quietness, sunlight and commute are scored.
2. Shows methodology behind Comfort Scores for renters.
3. CTA into comfort-filtered property search.

#### comfort-scores.html — Comfort Scores
1. Explains the four Comfort Scores (quiet, sunlight, commute, pet-friendly).
2. Helps renters pick a home they'll actually love living in.
3. Links to properties filtered by comfort.

#### community-focused.html — Community Focused
1. Renting + services/community angle (house → home).
2. Direct tenant-owner connection benefits.
3. CTA to browse properties and join.

#### contact.html — Contact Us
1. Contact form (name, email, message) for general enquiries.
2. Support channels + expected-response framing.
3. Cross-links to helper (Help Center) and faq.

#### fair-for-everyone.html — Fair for Everyone
1. Explains how the platform keeps renting fair and transparent for both sides.
2. Covers honest pricing, verification and dispute-handling principles.
3. CTA into trust-and-safety and properties.

#### faq.html — FAQ
1. Accordion of frequently asked questions (renting, payments, verification, escrow).
2. Quick self-serve answers before contacting support.
3. Fallback links to helper, support-tickets and contact.

#### heavenlease.html — HeavenLease Hub
1. Public/no-auth hub page linking into the main platform areas.
2. Serves the clean `/heavenlease` route via nginx.
3. Quick entry points to log in, sign up and browse properties.

#### helper.html — Help Center
1. Help Center hub: FAQs, guides and support channels in one place.
2. Organized help topics for tenants and owners.
3. CTA to open a support ticket.

#### how-it-works.html — How It Works
1. Step-by-step explainer: search → tour → sign → pay (all online).
2. No-broker, direct-owner messaging throughout.
3. CTAs to browse properties and create an account.

#### index.html — Homepage (landing)
1. Landing hero with comfort-first search and the no-broker value proposition.
2. Sections: how-it-works teaser, comfort scores, pricing, trust, featured properties.
3. Footer with full sitemap links (guest login-gate) + SEO (canonical, OG, JSON-LD, sitemap).

#### map.html — Property Map
1. Live property map — owners add homes and they appear instantly.
2. Pin click shows a preview and links into property-detail.
3. CTA to list a property or browse the list view.

#### no-brokers-ever.html — No Brokers, Ever
1. Core pitch explaining how removing brokers saves money for both sides.
2. Direct tenant-owner connection with verified listings.
3. CTA to start searching.

#### press.html — Press
1. Press releases and media resources in chronological order.
2. Brand/media kit landing for journalists.
3. Contact channel for press enquiries.

#### pricing.html — Pricing
1. Transparent pricing: Tenant Access from ₹299, Owner Plus from ₹299, pay-as-you-go services.
2. Plan/feature comparison for tenants and owners.
3. CTA into signup and upgrade-plan.

#### speed-and-simplicity.html — Speed and Simplicity
1. "Rent faster" pitch — days, not weeks, from search to move-in.
2. Covers the online search→tour→sign→pay path.
3. CTA to browse properties.

#### trust-and-safety-first.html — Trust and Safety First
1. Trust pillars: verification, escrow protection, secure tools.
2. Safety measures explained for both tenants and owners.
3. CTA to learn more or start a rental/search.

### B. Buy/sell & policy pages (5)

#### buy-a-home.html — Buy a Home
1. Browse verified homes for sale with no-broker buying.
2. Direct owner contact, fair pricing and comfort scores.
3. Filter/sort entry points to keep browsing simple.

#### buy-sell.html — Buy & Sell Homes
1. Dual hub for buyers and sellers.
2. Verified sellers, no brokerage commission.
3. CTAs for browsing homes or listing a property.

#### sell-your-home.html — Sell Your Home
1. List a property for sale to verified buyers.
2. No commission, direct contact and dealing.
3. CTA into list-property/add-property or owner signup.

#### possession.html — Possession
1. Explains the possession/handover process (inspection → escrow release → keys).
2. Step timeline so tenants/owners know what happens and when.
3. Links to escrow-policy and lease pages.

#### escrow-policy.html — Escrow Policy
1. Documents how the security deposit escrow is protected.
2. Explains two-party release and dispute handling.
3. Legal-transparency page linked from lease/payment flows.

### C. Owner tools, guides & tenant-screening pages (17)

#### background-check.html — Background Check
1. Tenant background checks with a safety-first framing.
2. Part of the tenant-screening toolkit for owners.
3. CTA into starting a screening report.

#### credit-score-check.html — Credit Score Check
1. Tenant credit-score and financial-history verification.
2. Shows a proven record of on-time payments.
3. CTA into the screening flow.

#### employment-verification.html — Employment Verification
1. Tenant employment and income verification.
2. Confirms affordability before signing a lease.
3. CTA into the screening flow.

#### identity-verification.html — Identity Verification
1. Government-ID checks for tenants and owners.
2. Confirms who you're really renting to.
3. CTA into screening/owner-verification.

#### lease-templates.html — Lease Templates
1. Ready-made rental lease agreement templates for owners.
2. Simple, clear and aligned with local practice.
3. CTA to start leases with a template.

#### maintenance-management.html — Maintenance Management
1. Maintenance guide for owners — track repairs and schedule checks.
2. Workflow tips to keep properties in shape.
3. CTA into the maintenance-requests tool.

#### owner-guides.html — Owner Guides
1. Practical landlord guides from first listing to smooth move-out.
2. Pricing, screening, maintenance and renewal topics.
3. Links to related owner tool pages.

#### owner-resources.html — Owner Resources
1. Resources and tools bundle for property owners.
2. Templates, guides and calculators.
3. CTA to list a property.

#### owner-support.html — Owner Support
1. Owner-specific help: listings, screening, billing and the dashboard.
2. Support tickets and FAQ entry points.
3. CTA to contact support.

#### rent-collection.html — Rent Collection
1. Automated rent collection pitch for owners.
2. Payment tracking, reminders and receipts in one place.
3. CTA to upgrade and enable collections.

#### rent-pricing-guide.html — Rent Pricing Guide
1. Data-driven rent pricing guide to set the right rent.
2. Helps avoid vacancies while staying competitive.
3. CTA to list a property at the right price.

#### rental-history.html — Rental History
1. Verify a tenant's past rental behaviour and landlord references.
2. Rent to tenants with a clean track record.
3. CTA into the screening flow.

#### rental-laws.html — Rental Laws
1. Rental laws in India — rights and responsibilities for both sides.
2. Education page for tenant and owner awareness.
3. Links to lease templates and policies.

#### tax-and-accounting.html — Tax & Accounting
1. Rental-income tax and accounting guide for owners.
2. Deductions, records and compliance essentials.
3. CTA to templates/resources.

#### tenant-management.html — Tenant Management
1. Manage current tenants and their leases.
2. Tenant profiles, screening and payment views.
3. CTA into lease-management and rent-collection.

#### tenant-ratings.html — Tenant Ratings
1. Tenant ratings and reviews from previous landlords.
2. Reputation-led screening for owners.
3. CTA into the screening flow.

#### tenant-screening.html — Tenant Screening
1. Pre-screened tenants hub for owners.
2. Combines background, credit, income and history checks.
3. CTA to start a screening request.

### D. Authentication & verification pages (9)

#### login.html — Sign In
1. Sign in with email or phone (password or OTP) + Google.
2. reCAPTCHA + login-attempt lockout; clean 401 auto-logout handler.
3. Links to signup and forgot-password; success → home/dashboard.

#### signup.html — Create Account
1. Manual signup for TENANT or OWNER with server-side validation + BCrypt.
2. Email/phone OTP verification before the account is active.
3. Google signup path; success → home.html.

#### forgot-password.html — Forgot Password
1. Request a password reset via email-OTP verification.
2. Sends a reset token used on the reset page.
3. Link back to login.

#### reset-password.html — Reset Password
1. Sets a new password (min 8 chars, letters + numbers).
2. Validates the reset token; updates the BCrypt hash.
3. Redirects to login on success.

#### otp-verify.html — OTP Verification
1. Single screen to enter the 6-digit OTP from email or phone.
2. Self-hosted OTP is DB-backed (10-min expiry, resend cooldown, attempt caps).
3. Success → verified account → dashboard/home.

#### verify-email.html — Verify Email
1. Email-address verification entry point.
2. Re-send + code entry for SES-delivered OTPs.
3. Verified state unlocks email features.

#### verify-account.html — Verify Account
1. Account-level verification covering email + phone wherever required.
2. Interactive status as each channel verifies.
3. Redirects to the intended post-login page.

#### owner-application.html — Owner Verification
1. Multi-step application to become a verified owner.
2. Business/property details and document collection.
3. Progress tracked awaiting admin approval.

#### owner-verify.html — Owner Verify
1. Upload verification documents (ID, ownership proof).
2. Feeds the admin review queue.
3. Status reflected on the owner dashboard.

### E. Dashboards & account pages (10)

#### home.html — Home (post-login)
1. Post-login hub with quick access to every platform feature.
2. Role-aware shortcuts (tenant vs owner vs admin).
3. Entry points to dashboards, messages, notifications and settings.

#### dashboard.html — Dashboard
1. Unified overview: properties, tours, leases, payments.
2. Status cards + recent activity for fast triage.
3. Quick actions adapt to the logged-in role.

#### admin-dashboard.html — Admin Dashboard
1. Admin-only control: users, properties and owner-verification moderation.
2. Stats + moderation tools at a glance.
3. Access enforced server-side by the ADMIN role.

#### owner-dashboard.html — Owner Dashboard
1. Listing visibility and subscription status at a glance.
2. Applications, messages and maintenance queue entry points.
3. upgrade-plan CTA when Access Pass is needed.

#### tenant-dashboard.html — Tenant Dashboard
1. Saved properties, applications and tour bookings.
2. Quick contact-owner / messaging shortcuts.
3. Payment and plan status summary.

#### edit-profile.html — My Profile
1. Instagram-style profile editor (username, bio, avatar, website).
2. Save persists via `/me` (phone normalization + validation bug fixed).
3. Success navigates back to the dashboard with saved values rendered.

#### account-settings.html — Account Settings
1. General account settings and preferences.
2. Language/locale and notification basics.
3. Links to security-settings and edit-profile.

#### security-settings.html — Security Settings
1. Password change, 2FA and device security.
2. Session/security hygiene for accounts.
3. Link to edit-profile for profile fields.

#### notification-settings.html — Notification Settings
1. Per-type notification preferences toggles.
2. Opt in/out of bell, email and reminders.
3. Saved against the user profile.

#### documents.html — Documents
1. Central document storage and management (IDs, leases, invoices).
2. Upload/organize per property or purpose.
3. Role-gated access (tenant sees own; owner sees theirs).

### F. Property search, detail & management pages (11)

#### properties.html — Browse Properties
1. Browse all verified rental properties.
2. Filters by comfort, budget, location.
3. Cards link into search-results and property-detail.

#### search-results.html — Search Results
1. Results grid with rent/buy/sell and comfort filters (pet/quiet/sun/commute).
2. Empty-state fallback keeps the page working if the API is down.
3. Click-through to property-detail.

#### property-detail.html — Property Details
1. Full listing: gallery, amenities and comfort scores.
2. Contact-owner gated until authenticated; book-tour + save actions.
3. One tap from search-results, map, compare or saved-properties.

#### property-compare.html — Property Compare
1. Side-by-side comparison of 2–4 properties.
2. Rent/budget, locality, comfort-score breakdown.
3. Picks from saved-properties or search results.

#### add-property.html — Add Property
1. Owner-only create-listing form.
2. Validation + amenities/images uploads.
3. Success → properties-management.

#### edit-property.html — Edit Property
1. Owner-only editing of an existing listing.
2. Update details/images; save → properties-management.
3. Delete option with confirmation.

#### list-property.html — List Your Property
1. Owner-facing CTA page for listing a home.
2. Verified-tenant pitch + simple steps.
3. CTA into add-property/signup.

#### saved-properties.html — Saved Properties
1. Favorites list for authenticated users.
2. Save/remove toggle and quick compare.
3. CTA to start a rental-application.

#### saved-searches.html — Saved Searches
1. Persistent saved searches with alert option.
2. One-tap re-run of the same filters.
3. Links back into search-results.

#### properties-management.html — Manage Properties
1. Owner dashboard for the full listing lifecycle.
2. Visibility/EU status per property.
3. Add/edit/delete actions in one place.

#### tour-booking.html — Book a Tour
1. Book a property tour — property, date and time.
2. Confirmation persists and appears on the dashboard.
3. Works for logged-in users and guests (prompts login when needed).

### G. Applications & lease pages (7)

#### rental-application.html — Rental Application
1. Apply for a listed property with a structured form.
2. Submission creates a tracked application for the owner.
3. Owner response appears in application-status/application-history.

#### application-history.html — Application History
1. Previously submitted applications listed chronologically.
2. Status badges (pending → accepted/rejected).
3. Drill into a single application for details.

#### application-status.html — Application Status
1. Live progress tracking for one application.
2. Stage timeline UI (submitted → reviewed → approved → lease).
3. Next-step hints (lease-signing when approved).

#### owner-applications.html — Owner Applications
1. Owner reviews tenant applications for their properties.
2. Accept/reject decisions drive the tenant's status page.
3. Accepted applicants continue to lease-signing.

#### lease-details.html — Lease Details
1. Full breakdown of a single lease agreement.
2. Terms, rent, tenancy dates and linked documents.
3. Entry point from lease-management or dashboard.

#### lease-management.html — Lease Management
1. Manage active and upcoming lease agreements.
2. Renewal/expiry visibility (renewal-reminder scheduler).
3. Per-lease actions (renew, view, sign).

#### lease-signing.html — Lease Signing
1. Review and e-sign the digital lease.
2. Clear before/after-sign states with confirmation.
3. Links the escrow + possession handoff context.

### H. Messaging & notification pages (3)

#### messages.html — Messages
1. Chat list connecting tenants and owners directly (no brokers).
2. Threads with latest-message previews.
3. Click a thread → conversation.html.

#### conversation.html — Conversation
1. Real-time chat thread powered by STOMP WebSocket at `/ws`.
2. Messages broadcast over `/topic/messages` (no refresh).
3. Sender/receiver UI with delivery state.

#### notifications.html — Notifications
1. In-app notification center (bell).
2. Tours, leases, payments, new listings, maintenance, reminders.
3. Mark-read actions linking to the relevant page.

### I. Payments & subscription pages (4)

#### payment.html — Payment (Access Pass checkout)
1. Razorpay checkout (UPI, cards, net-banking) for Access Pass.
2. Server-side signature verification — fail-closed on invalid callbacks.
3. Success unlocks plan access + stores the receipt.

#### payment-methods.html — Payment Methods
1. Manage saved payment methods.
2. Add/remove and set a default method.
3. Used by checkout for quicker payment.

#### transaction-history.html — Transaction History
1. Full Access Pass payment history.
2. Printable invoice/receipt (Print → Save PDF).
3. Renewal/expiry status per subscription.

#### upgrade-plan.html — Upgrade Plan
1. Owner Plus upgrade: boosted listings, analytics and more.
2. Plan comparison + price summary.
3. CTA into payment.html checkout.

### J. Maintenance, support & report pages (7)

#### maintenance-request.html — Maintenance Request
1. Tenant-form to create a request (category, priority, property picker).
2. Submission notifies the owner instantly.
3. Status visible afterward in the tenant's queue.

#### maintenance-requests.html — Maintenance Requests
1. Owner/manager queue across properties.
2. Start / Done / Cancel lifecycle actions.
3. Status change notifies the tenant (bell).

#### support-tickets.html — Support Tickets
1. Create and manage support requests.
2. Ticket statuses and priorities at a glance.
3. Opens a detail view for the conversation.

#### support-ticket-detail.html — Support Ticket
1. Single-ticket conversation thread.
2. Replies from support + resolution/close state.
3. History retained for the user's records.

#### report-property.html — Report Property
1. Report a property/listing (reason + details).
2. Structured submission to the admin moderation queue.
3. Follow-up only when required.

#### report-user.html — Report User
1. Report a user for policy violations.
2. Reason and supporting detail fields.
3. Routes to admin review.

#### write-review.html — Write Review
1. Submit a property or tenant review with a rating.
2. Structured, moderated review content.
3. Feeds rating display on relevant pages.

### K. Legal pages (3)

#### privacy.html — Privacy Policy
1. Data collection, usage and sharing disclosures.
2. Cookies and consent pointers.
3. Contact channel for privacy questions.

#### terms.html — Terms of Service
1. Platform terms of service for tenants and owners.
2. Acceptable use and liability framing.
3. Legal contact details.

#### cookies.html — Cookie Policy
1. Cookie categories and purposes explained.
2. How to manage/disable via browser settings.
3. Ties into the site consent banner.

---

_Total: 21 + 5 + 17 + 9 + 10 + 11 + 7 + 3 + 4 + 7 + 3 = 97 HTML pages._
_Flows & journey maps: see `flow.md`._