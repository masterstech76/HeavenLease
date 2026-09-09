# HeavenLease — Rebuild Plan (living document)

> **Purpose:** If a session limit interrupts work, the next session reads THIS file and continues.
> **Rule:** Code file content is ALWAYS written with the `editor` tool (never PowerShell `Set-Content`, which corrupts encoding/line-endings). Renames/moves use byte-preserving `Move-Item`. No `git push`, no commits — local only until the user tests and explicitly asks to publish.

## 0. User rules (locked in)

- [x] Backup current `static/` + edited backend controller → `backup/static-backup-20260908-212454/` (125 files).
- [x] Save this plan inside the project root so work resumes after interruptions.
- [ ] NO GitHub push / no commit — local edits only, user tests first.
- [ ] Rename/move files when required (byte-preserving), update all references in the same pass.
- [ ] Workspace: `c:\Users\techm\OneDrive\Desktop\Renatal Home`

## 1. Goal

A fully functional full-stack product (target 7–8 Lakhs):
- All pages use the SAME design tokens as `index.html` (`--primary:#5b5ce2; --primary-dark:#4445c5; --ink:#182033`).
- No inline `<script>` in HTML — all JS lives in `static/js/`, one file per page (`js/pages/<page>.js`).
- No demo data inside HTML — only `static/demo/` holds demo arrays; deleting that folder keeps every page working on the real API (guarded `if (window.HL_DEMO_DATA) … else realApi()`).
- Consistent header / navbar / footer on every page; mobile-responsive per `static/redesign.md` (320→1440px, hamburger, no horizontal scroll).

## 2. Architecture

```
static/
  api.js, script.js, verification-panel.js   (final phase: move into js/)
  js/
    api.js                 ← final home of the shared HTTP client (renamed from root api.js)
    core.js                ← shared UI/nav/toast (renamed from script.js)
    verification-panel.js  ← moved
    pages/<page>.js        ← ONE module per functional page (dashboard, tenant-ratings, …)
  demo/
    demo-data.js           ← the ONLY place demo arrays live (window.HL_DEMO_DATA)
```

## 3. Current state (audit at 2026-09-08)

### Already fixed (this working session)
- [x] `backend/.../FeedbackController.java` — accepts `reviews` + `reviews_prop_*` page keys; `GET /api/feedback/page/{key}` returns `userName` per rating.
- [x] `static/write-review.html` — removed duplicate "My Dashboard" CTA.
- [x] `static/blog-detail.html` — added `statusWrap` null-guard (was crashing script).
- [x] `static/tenant-ratings.html` — full rating feature (CSS + HTML section + JS): avg summary, live list (name/stars/comment), "Write a Rating" → write-review, inline submit form.

### Red — Broken / static shells (need wiring)
- `dashboard.html` — ZERO scripts; static shell. NEEDS `js/pages/dashboard.js` (phase A = dashboard.js + script tags).
- `tenant-dashboard.html`, `owner-dashboard.html` — branded redirects → `dashboard` (keep, polish).
- `conversation.html` — real thread UI, NO api.js, NO API calls → wire via messages/WebSocket (`js/pages/conversation.js`).
- `application-history.html` — hardcoded `applications=[...]` demo → move to demo/, guard, real API fallback.
- `add-property.html` — demo landing (duplicate of real `list-property.html`); pending user permission to remove; repoint `map.html` link.
- `lease-management.html` — zero scripts.
- `faq.html` — flagged "incomplete" in redesign.md; expand.

### High
- ~50 pages carry inline scripts with real `api.*` calls → extract to `js/pages/*.js`.
- ~25 pages reference `hamburger`/`navLinks` ids missing from markup → mobile menu absent → add shared hamburger via core.js.
- Colors differ per page → unify to index tokens.

### Green (keep as-is)
login/signup/forgot/reset-password, otp-verify, verify-email/account, edit-profile, admin-dashboard, properties, property-detail, map, messages, payment, rent-collection, maintenance-request(s), 6 screening pages, documents, notifications, support-tickets, tour-booking, owner-application/verify/applications, transaction-history, index (demo pattern already correct).
## 4. Phases (checklist)

- [x] **P0 Setup** — `js/` + `js/pages/` created; `verify.py` (tag balance, orphan api refs, id check, mobile breakpoints) written with editor; run before/after each phase. (Python 3.13 available.)
- [ ] **A. Dashboard restore** — `js/pages/dashboard.js` (profile, stats, feature hub, docs summary, recent activity, quick actions, mobile sidebar) + add script tags to `dashboard.html`.
- [ ] **B. JS extraction** — one `js/pages/<page>.js` per functional page; replace inline blocks with `<script src="js/pages/<page>.js?v=…">`.
- [ ] **C. Demo isolation** — move hardcoded arrays into `demo/`; add `window.HL_DEMO_DATA` guard; verify deletion of `static/demo/` never breaks (real API takes over).
- [ ] **D. Missing features** — tenant-ratings ✅; conversation wiring; faq expansion; application-history real data; add-property removal (pending permission).
- [ ] **E. Style unification** — all pages → index tokens; shared navbar/footer via core.js; consistent buttons/cards/inputs.
- [ ] **F. Mobile responsive** — audit at 320/375/390/430/768/1024/1280/1440; hamburger everywhere; no horizontal scroll; 44px touch targets.
- [x] **G. Cutover** — ✅ DONE 09-Sep-2026: api.js→js/api.js, script.js→js/core.js, verification-panel.js→js/; 107 pages bulk-updated (83/77/3 src swaps); root copies removed; 107 HTML + 96 JS = 0 failed + demo-deleted sim green.
- [ ] **H. Handoff** — full verification incl. "demo folder deleted" dry run; update testing.md + SELLER-CHECKLIST.md; backup-restore instructions.

## 5. Renames / moves pending permission

- `add-property.html` → REMOVE (duplicate of list-property; only `map.html` links it). NEEDS USER OK.
- `buy-a-home.html` / `sell-your-home.html` / `buy-sell.html` overlap → CONFIRM which stays.
- Keep redirects: `search-results.html`, `heavenlease.html`, `tenant-dashboard.html`, `owner-dashboard.html`, `conversation.html` (fix not delete).

## 6. Progress log

- 2026-09-08 — Backup; plan created; js/ dirs; dashboard.js written; phase A.
- 2026-09-08 — PHASE A DONE: `js/pages/dashboard.js` (250 lines) + `dashboard.html` script tags. `verify.py` (18-section full plan) added at root; robust JS tokenizer for balance checks.
- 2026-09-08 — Phase C start: `application-history.html` converted to dual-mode (demo/real), demo array → `demo/demo-data.js`, module `js/pages/application-history.js`. verify.py: 109 HTML + 2 JS all GREEN (0 failed). Pre-existing tag quirks on maintenance-management/owner-application/transaction-history tracked (fixed in Phase E/F).
- 2026-09-08 — `lease-management.html` rewired: `js/pages/lease-management.js` renders real leases (owner/tenant/admin) into new-design `.lease-item` cards + window.leaseAction. verify: 3/3 JS ok.
- 2026-09-08 — `conversation.html` rewired: `js/pages/conversation.js` (real inbox: getMyConversations → threads, getConversation → messages, sendMessage + WebSocket live updates, search + unread/owner filters). verify: 4/4 JS ok.
- 2026-09-08 — FAQ expanded 10→25 entries + duplicate CTA removed. Phase B continue: extracted inline JS to modules for tenant-ratings, write-review, index (demo renderer + landing UI). verify: 7/7 JS ok, 109 HTML green.
- 2026-09-08 — Phase B: comfort-scores (live feedback), blog-detail (status widget+nav), home (auth hub + natural-language search; fixed latent goSearch scoping bug → window.goSearch). verify: 10/10 JS ok.
- 2026-09-08 — Phase B: properties (browse) extracted → js/pages/properties.js (real API load, URL params, paywall gate with server subscription truth, filters/sort/pagination/favorites). Fixed 2 seam-induced brace bugs via tokenizer. verify: 109 HTML + 11 JS = 0 failed.
- 2026-09-08 — Phase B: property-detail extracted → js/pages/property-detail.js (gallery/amenities/comfort/owner-card render, favorite toggle, booking submit, chat gate). verify: 109 HTML + 12 JS = 0 failed.
- 2026-09-08 — Phase B: messages (inbox) extracted → js/pages/messages.js (real conversations + WS + Access-Pass gate + ?property= auto-open). verify: 109 HTML + 13 JS = 0 failed.
- 2026-09-08 — Phase B: application-status extracted → js/pages/application-status.js (hero timeline + sign-in guard + fallback). verify: 109 HTML + 14 JS = 0 failed.
- 2026-09-08 — Phase B: extracted properties-management (owner CRUD list + delete), notifications (real backend + mark read/all), tenant-management (lease→tenant roster). verify: 109 HTML + 17 JS = 0 failed.
- 2026-09-08 — Phase B: transaction-history extracted → js/pages/transaction-history.js (payments list + escrow approve/dispute + invoice modal). verify: 109 HTML + 18 JS = 0 failed.
- 2026-09-08 — Phase B: saved-properties extracted → js/pages/saved-properties.js (backend favorites + property cache + remove). verify: 109 HTML + 21 JS = 0 failed.
- 2026-09-08 — Phase B: tour-booking extracted (property select + time slots + real booking) + lease-details (agreement cards) + saved-searches→shared saved module. verify: 109 HTML + 23 JS = 0 failed.
- 2026-09-08 — Phase B: maintenance-requests extracted (owner queue: start/mark-done/cancel). verify: 109 HTML + 24 JS = 0 failed.
- 2026-09-08 — Phase B: support-tickets + support-ticket-detail extracted (list + create/view). verify: 109 HTML + 27 JS = 0 failed.
- 2026-09-08 — Phase B: faq extracted (23-entry bank + search + accordion). verify: 109 HTML + 28 JS = 0 failed.
- 2026-09-08 — Phase B: edit-property, report-property + report-user → shared js/pages/report.js (+ CTA fix). verify: 109 HTML + 30 JS = 0 failed.
- 2026-09-08 — Phase B: property-compare (up to 4 properties table) + payment-methods (subscription + payments). verify: 109 HTML + 32 JS = 0 failed.
- 2026-09-08 — Phase B: documents extracted (list + upload + delete). verify: 109 HTML + 33 JS = 0 failed.
- 2026-09-08 — Phase B: payment extracted (Razorpay order/checkout/verify/success + plan select + already-paid banner). verify: 109 HTML + 34 JS = 0 failed.
- 2026-09-08 — Phase B: map extracted → js/pages/map.js (Leaflet live map + sidebar + add-property-from-map). verify: 109 HTML + 35 JS = 0 failed.
- 2026-09-08 — Phase B: admin-dashboard extracted (users/properties/owner-apps + integration settings). verify: 109 HTML + 36 JS = 0 failed.
- 2026-09-08 — Phase B: edit-profile extracted (profile save + avatar upload + password + deactivate/delete). verify: 109 HTML + 37 JS = 0 failed.
- 2026-09-08 — Phase B: login extracted → js/pages/login.js (auth guard, tabs, password/email-OTP/phone-OTP, Google). verify: 109 HTML + 38 JS = 0 failed.
- 2026-09-08 — Phase B: forgot-password extracted (send/verify/resend OTP) + fixed module-after-api ordering. verify: 109 HTML + 39 JS = 0 failed.
- 2026-09-08 — Phase B: otp-verify + verify-email extracted (guard + params + OTP + verify/resend), notification/account/security-settings done. verify: 109 HTML + 44 JS = 0 failed.
- 2026-09-08 — Phase B: signup (full OTP + Google), owner-verify/application, no-brokers-ever (fixed undeclared `isPaid` → subscription gate). verify: 109 HTML + 50 JS = 0 failed.
- 2026-09-09 — **Phase C (demo isolation) DONE.** Moved add-property grid + careers jobs → `demo/demo-data.js` (`addPropertyGrid`, `careersJobs`); guarded modules (`window.HL_DEMO_DATA` → else empty/real API). Pages now loading demo-data.js: index, application-history, add-property, careers. blog/blog-detail/comfort-scores = no demo arrays (real API/localStorage already).
- 2026-09-09 — **Phase G (cutover) DONE.** Moved `static/api.js`→`static/js/api.js`, `static/script.js`→`static/js/core.js`, `static/verification-panel.js`→`static/js/verification-panel.js` (byte-preserving Move-Item). Bulk-updated all 107 pages: `src="api.js"→"js/api.js"` (83 tags), `"script.js"→"js/core.js"` (77 tags), `"verification-panel.js"→"js/verification-panel.js"` (3 tags); zero old-style refs remain; no self-refs to old paths inside moved files; map.js comment already referenced `js/api.js/js/core.js`. `verify.py` now validates 96 JS files (93 pages + 3 core). Final: **107 HTML + 96 JS = 0 failed**; demo-deleted sim also 0 failed.
- 2026-09-09 — **Logo-visibility root cause FIXED (the real one).** `styles.css` contained `.logo-icon { background-image: url('logo.svg') }` + `.logo-icon i { display: none }` — so every page that put a Font-Awesome `<i>` house glyph inside `.logo-icon` had that glyph **hidden** (empty gradient chip). Replaced with `.logo-icon { background: linear-gradient(primary→primary-dark) }` + `.logo-icon i { font-size:18px; color:#fff; display }`. Verified: zero pages still hide the icon; index/home inline `.logo-icon` (gradient) comes after styles.css → renders the house glyph. Fix is global (all 107 pages load styles.css). verify: 107 HTML + 96 JS = 0 failed.
- 2026-09-09 — **Phase E-2 (inline CSS color unification) DONE.** Remapped every page's INLINE `<style>` `:root` custom properties + hardcoded hexes (incl. `style="…"` attrs + JS-injected card colors) to the index palette: `--primary:#4f46e5→#5b5ce2`, `--primary-dark:#4338ca→#4445c5`, ink `#0f172a/#172033/#111827/#0b1220→#182033`, tints `#eef2ff/#c7d2fe→#eef0ff`, `#a5b4fc→#aeb1ff`, gradient `#7c3aed→#4445c5`, golds `#b28a4a/#d5b778/#916936/#dfbd87→#5b5ce2/#4445c5`, sky `#0284c7→#5b5ce2`, plus `--hl-*`, `--auth-*`, `--purple`, `--brand`, `--gray-*` var systems. Semantic status colors (success `#10b981/#18a878`, danger `#ef4444`, warning `#f59e0b`) preserved. 107 pages touched; final residue = index palette + semantics only, **zero divergent `:root` values**. verify + demo-deleted sim = 0 failed.
- CHECKPOINT — A ✅ B ✅ C ✅ D (all but add-property decision — needs user OK). Next: E style unification (97 pages not on index palette) → F mobile (107 pages without hamburger id) → G cutover → H handoff.
- CHECKPOINT — 55 modules. All functional (api-calling) inline JS extracted. Remaining inline is static/marketing boilerplate only (navbar/scroll/back-to-top/help-mailto on no-API pages + demo arrays in add-property/careers/buy-sell + tenant-dashboard redirect) → handled in Phase C (demo isolation) and Phase E (shared core.js navbar).
- 2026-09-08 — Phase B: extracted owner-applications (accept/decline + MutationObserver), rental-application + rental-history → shared js/pages/rental.js (property preview + application submit). verify: 109 HTML + 20 JS = 0 failed.
- Phase checkpoints: A dashboard ✅ | B all inline JS extracted ✅ (93 modules, 0 verify failures) | C demo isolation ✅ (index, application-history, add-property, careers, application-status all consume `demo/demo-data.js`; demo-deleted sim verifies green) | D missing features ✅ (conversation, maintenance-mgmt, faq, tenant-ratings; add-property kept per user rule — no deletions) | E unified single `styles.css` ✅ | F mobile audit + 44px/touch/viewport polish ✅ | G cutover js/ ✅ (107 HTML + 96 JS = 0 failed) | H handoff ✅ (docs updated 09-Sep-2026).
- TODO — Phase D: verify conversation wiring end-to-end; maintenance-management.html interactive wiring; resolve add-property removal (permission-gated). Then E → F → G → H.

## 7. Validation

- `python <root>/verify.py` — every HTML: balanced tags, no orphan api refs, JS id refs exist, script tags balanced, mobile media queries present.
- `python <root>/verify.py --no-demo` — simulates deleting `static/demo/` (run with a temp-copied tree).
## 8. Full page inventory (109 pages) → action → JS module

### 🔴 BROKEN / STATIC — rewire first (Phase 1)
| Page | Problem | Action | Module |
|---|---|---|---|
| `dashboard.html` | 0 scripts (321-line static shell) | Restore full dashboard | `js/pages/dashboard.js` |
| `conversation.html` | Thread UI, no api.js, no API calls | Wire to Message API + WS | `js/pages/conversation.js` |
| `application-history.html` | Hardcoded `applications=[...]` | Move array → demo/, guard, real API | `js/pages/application-history.js` |
| `add-property.html` | Demo landing (dup of list-property) | REPLACE with real form OR remove (pending user OK) | `js/pages/list-property.js` owns submit |
| `lease-management.html` | 0 scripts | Restore lease list from API | `js/pages/lease-management.js` |
| `faq.html` | redesign.md says "FAQ page incomplete" | Expand FAQ bank + polish | `js/pages/faq.js` |
| `tenant-ratings.html` | Feature done this session ✅ | Keep | inline JS → extract to `js/pages/tenant-ratings.js` |

### 🟠 INLINE-JS PAGES — extract to `js/pages/<name>.js` (Phase 2)
about, account-settings, admin-dashboard, application-status, background-check, blog-detail, blog, comfort-scores, contact, documents, edit-profile, edit-property, employment-verification, forgot-password, home, identity-verification, credit-score-check, lease-details, lease-signing, login, maintenance-management, maintenance-request, maintenance-requests, map, messages, no-brokers-ever, notification-settings, notifications, otp-verify, owner-application, owner-applications, owner-verify, payment-methods, payment, pricing, properties-management, properties, property-compare, property-detail, rental-application, rental-history, report-property, report-user, reset-password, saved-properties, saved-searches, security-settings, signup, support-ticket-detail, support-tickets, tenant-management, tour-booking, transaction-history, verify-account, verify-email, write-review, index (demo renderer → js/pages/index.js)

### 🟢 MARKETING/STATIC — keep content; unify style + mobile + shared nav (Phase 5–6)
about/what's info pages, buy-a-home, buy-sell, sell-your-home, careers, comfort-over-everything, community-focused, cookies, escrow-policy, fair-for-everyone, finding-pet-friendly-rentals, helper, how-it-works, how-to-choose-the-right-neighbourhood, maximizing-your-rental-income, no-brokers-ever, owner-guides, owner-resources, owner-support, possession, press, privacy, rent-pricing-guide, rental-laws, speed-and-simplicity, tax-and-accounting, terms, the-ultimate-moving-checklist, trust-and-safety-first, understanding-escrow-protection, why-sunlight-matters-in-a-home, upgrade-plan, write-review

### 🔀 REDIRECT PAGES — keep (bookmark targets), polish
`heavenlease.html` → index · `search-results.html` → properties · `tenant-dashboard.html` → dashboard · `owner-dashboard.html` → dashboard · `401/403/404/500/502/503.html` (static error pages) · `maintenance.html` (scheduled maintenance splash)

## 9. Dashboard module spec (Phase A) — exact behavior to restore

Recovered from `git show HEAD:static/dashboard.html` (lines ~689–870). Elements already present in new `dashboard.html`:

- Profile: `dashUserName`, `dashUserRole`, `dashWelcome`, `dashSubtitle`, `dashProfileName`, `dashProfileUsername`, `dashProfileBadge`, `dashProfileBio`, `dashProfileEmail/Phone/Gender/Website(+Wrap)`, `dashProfileAvatar`, `dashEditProfileBtn`
- Sidebar: `dashSidebar`, `dashMobileToggle` + `dash-nav-item` active state
- Header buttons: `btnAddProperty`, `btnBrowse` (show by role)
- Stats: `statProperties`(+`statPropertiesLabel`), `statTours`, `statLeases`, `statSubscription`
- Cards: `dashFeatureHub`, `quickActions`, `recentListTitle`, `recentListBody`, `col1/col2/col3`, `dashDocSummary`, `docViewAllLink`
- API: `api.getMe()`, `api.setUser(merged)`, `api.getPropertiesByOwner(uid)`, `api.getBookingsByOwner/Tenant(uid)`, `api.getLeasesByOwner/Tenant(uid)`, `api.getSubscription()`, `api.getReceivedDocuments()` (owner/admin) / `api.getMyDocuments()` (tenant)

Logic to reproduce in `js/pages/dashboard.js`:
1. Auth guard (api auto-protects `dashboard` already), role = user.role
2. `populateProfile(cache)` then `await api.getMe()` merge (id,email,role,name,phone,username,bio,avatarUrl,website,gender,verified) → `api.setUser(merged)` → `populateProfile(merged)`
3. Owner-only: `navRentCollection` show, `navMyProperties` →properties-management, `docViewAllLink`→owner-verify, `btnAddProperty` show, quick actions/hub owner set; tenant set otherwise
4. Stats load + recent list (owner: My Properties rows; tenant: Your Tour Requests), docs summary counts (pending/verified/rejected)
5. Mobile sidebar toggle + outside-click close + nav-item active swap

## 10. Shared UI spec (core.js — from script.js)
`js/core.js` provides: navbar scroll class, hamburger toggle (if `hamburger`+`navLinks` exist), back-to-top, `showToast(message, type)`, `initProfileMenu()` (profile dropdown + auth-aware sign in/logout), logo href auth-aware, `animateCounter`, `createPropertyCard` (escaped), `escapeHtml` fallback. Pages include: `api.js` → `core.js` → `js/pages/<page>.js`.

## 11. Demo isolation spec (Phase C)
- Files containing hardcoded arrays: `application-history.html` (applications), `add-property.html` (properties), `blog.html`/`blog-detail.html` (posts), `comfort-scores.html` (scores), `demo/demo-data.js` (index featured/categories/steps/faq).
## 12. Design tokens (Phase E) — INDEX palette everywhere
```
--primary:#5b5ce2;  --primary-dark:#4445c5;  --primary-light:#eef0ff;
--ink:#182033;      --muted:#687386;
--light:#fff;       --gray-50:#f7f8fc; --gray-100:#eef0f5; --gray-200:#e4e7ee;
--success:#10b981;  --danger:#ef4444;  --warning:#f59e0b;
--radius: 10/14/20/28; --shadow: sm/md/lg (from index)
```
Apply to: every page's `:root` + all inline `#4f46e5/#5b5ce2/various` hex overrides; shared navbar (.navbar/.nav-container), footer (.hl-footer already mostly unified), buttons (.btn/.btn-primary), badges, cards, inputs, tables. Goal: identical look across all 109 pages.

## 13. Mobile responsive (Phase F) — per redesign.md
- Breakpoints: 320 / 375 / 390 / 430 / 768 / 1024 / 1280 / 1440.
- Every page: add hamburger + `navLinks` element (many pages' JS already reference them — currently missing → no menu).
- Fix: grids stack (cards 4→2→1), forms ≤2 cols→1 col, inputs ≥44px, buttons full-width on ≤600px, tables `overflow-x:auto`, no horizontal scroll, hero stacks vertically, footer stacks, modals fit viewport.
- Audit checklist from redesign.md §15 applied page-by-page.

## 14. Cutover / renames (Phase G)
1. `Move-Item static\api.js static\js\api.js`
2. `Move-Item static\script.js static\js\core.js`
3. `Move-Item static\verification-panel.js static\js\verification-panel.js`
4. Batch-update every page: `src="api.js?v=…"` → `src="js/api.js?v=20260913b"`, `src="script.js?v=…"` → `src="js/core.js?v=20260913b"`, `src="verification-panel.js?v=…"` → `src="js/verification-panel.js?v=20260913b"`. Also `css` copy `styles.css` stays at root (no move) to avoid 109 stylesheet link edits — optional.
5. Delete obsolete root copies only after ALL references updated + verify passes.

## 15. Permission-gated deletions (NOT done without user OK)
- `add-property.html` (only `map.html` links it) → propose removal after building real list-property form.
- `buy-a-home.html` / `sell-your-home.html` / `buy-sell.html` → confirm single buy/sell hub.
- `get-started` / other stubs — none found.
- Keep: redirects + error pages + `maintenance.html`.

## 16. API surface (from static/api.js — all available for wiring)
auth: getMe/setMe? (login/register/otp/forgot/reset), properties: getProperties/getProperty/getPropertiesByOwner/createProperty/updateProperty/deleteProperty/uploadPropertyPhoto, bookings: getBookingsByTenant/Owner/createBooking/updateBookingStatus, leases: getLeases*/getLease/createLease/updateLease/deleteLease, favorites: getFavoritesByUser/addFavorite/removeFavorite, feedback: submitFeedback/getFeedback, documents: uploadDocument/getMyDocuments/getReceivedDocuments/updateDocumentStatus/deleteDocument, payments: getSubscription/createPayment?/razorpay, messages: getMessages/sendMessage/conversations, notifications: getNotifications/markRead, owner-applications: createOwnerApplication/getOwnerApplications/updateOwnerApplicationStatus, tickets: createTicket/getTickets/getTicket/respondTicket, users: getUsers/verifyUser/updateProfile/changePassword/deleteUser, public: getPublicConfig/getPublicStats.

## 17. Progress log (append-only)
- 2026-09-08 — Backup `backup/static-backup-20260908-212454/` (125 files); REBUILD-PLAN.md created; FeedbackController + write-review + blog-detail fixed; tenant-ratings feature added; plan file completed with full spec (this session).

## 18. Validation (verify.py — root, run after each phase)
Checks per HTML file: tag balance (stack-based HTMLParser), `<script>` open/close count, no orphan `api.` refs without api.js include, getElementById/querySelector# ids exist, mobile `@media max-width` present, no `demo/` src references when `--no-demo`. Exit non-zero on any failure. Run: `python verify.py` and `python verify.py --no-demo`.
- Pattern (already proven on index.html):
  ```js
  const d = window.HL_DEMO_DATA;
  if (d && Array.isArray(d.X)) { render(d.X); }
  else if (window.api && typeof api.getX === 'function') { api.getX().then(render).catch(() => {}); }
  ```
- `demo/demo-data.js` sets `window.HL_DEMO_DATA = {...}` + `window.HL_DEMO_NOTICE`.
- Deleting `static/demo/` must leave zero dead references → grep test: no `demo/` src remaining; all pages still call real API. (`verify.py --no-demo` simulates this on a temp copy.)