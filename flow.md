# HeavenLease — Page Flow & Workflow

> How the static frontend, nginx and the Spring Boot backend connect: which page
> leads where, and how each business workflow runs end-to-end.
> Related: `testing.md` (feature list for every page) · `backend/` (API sources).

## 0. URL routing (nginx)

- **Clean URLs** — `/login`, `/properties` serve `login.html`, `properties.html`; unknown paths → `/404`.
- **Old `.html` links** → 301 redirect to the clean URL (`/index` → `/`).
- Pages are **not** auth-gated by nginx — the **backend API** enforces access (401/403 JSON).
- Static files are served by nginx; `/api/*` and `/ws` are proxied to Spring Boot.

## 1. Role model

- **GUEST** — no session; public marketing pages only.
- **TENANT** — search, save, book tours, apply, chat, pay Access Pass, maintenance, reviews.
- **OWNER** — publish/manage listings, review applications, leases, rent, maintenance.
- **VERIFIED_OWNER** — owner + approved identity (via owner-application flow).
- **ADMIN** — user/property moderation, owner-verification approval, integrations, stats.

## 2. Guest journey (public)

```
index/login/signup  (no session)
   │
   ├── how-it-works · comfort-scores · no-brokers-ever · buy-a-home · pricing
   ├── properties / search-results / map ──▶ property-detail ──▶ login-gate
   └── contact · helper · faq · blog · press · careers
```

## 3. Authentication flow

```
signup.html ──▶ email/phone + OTP verify (SES / self-hosted) ──▶ JWT ──▶ home.html
login.html ──▶ credentials | phone-OTP | Google ──▶ /api/auth/login ──▶ JWT ──▶ home/dashboard
forgot-password.html ──▶ email OTP ──▶ reset-password.html (token validated) ──▶ login.html
401 anywhere ──▶ frontend auto-logout ──▶ login.html
```
## 4. Tenant flows

```
search:   index → properties / search-results / map → property-detail
          └─▶ book tour (tour-booking) · save (saved-properties) · chat
apply:    rental-application → application-status → respond to owner
lease:    lease-signing → lease-details → lease-management (renewal reminders)
payment:  payment → Razorpay → transaction-history (invoice) / upgrade-plan
maintenance: maintenance-request → maintenance-requests
messages: messages → conversation (live WebSocket) · notifications bell
```

## 5. Owner flows

```
verify:   owner-application → owner-verify (docs) → VERIFIED_OWNER badge
list:     list-property → add-property → edit-property → properties-management
review:   owner-applications → accept/reject → lease-signing
manage:   lease-management · tenant-management · tenant-screening
rent:     rent-collection · transaction-history
maintenance: maintenance-requests (queue → Start/Done/Cancel)
support:  owner-support · support-tickets
```

## 6. Payment & subscription flow

```
upgrade-plan / payment.html
   → Razorpay checkout (UPI/cards/netbanking)          [payment-methods]
   → /api/payments/callback → server-side signature verify (fail-closed)
   → Access Pass / Owner Plus granted → success page + receipt
   → transaction-history (printable invoice PDF) · renewal reminders (7 days)
```

## 7. Escrow flow

```
deposit recorded → ADMIN hold → tenant approve + owner approve → ESCROW_RELEASED
                                     │
                                     └─ dispute → admin resolve
in-app notification at every transition (initiated/held/released/disputed/resolved)
```

## 8. Maintenance flow

```
tenant:   maintenance-request (category, priority, property)
owner:    maintenance-requests queue → Start → Done / Cancel
status change → notification to tenant (bell + optional email)
```

## 9. Messaging & notifications

- Chat: `messages.html` → `conversation.html`; STOMP over `/ws`.
- Send to `/app/*`, broadcast received on `/topic/messages` (no page refresh).
- Notifications: `/api/notifications` drives the bell (tours, leases, payments,
  new listings, maintenance, renewal reminders).

## 10. Admin flows

```
admin-dashboard → users · properties · owner-verifications · moderation
  → integrations (Google/reCAPTCHA/Razorpay keys) · stats · reports queue
```

## 11. Backend request flow

```
Browser → nginx (TLS, clean-URL, static) → /api/* or /ws
        → Spring Security: rate-limit filter → JWT filter → authorize
        → Controller → Service → Repository (RDS / DynamoDB) → JSON
        → frontend renders; 401 → auto-logout; 403/404 → clean message
```

## 12. Deployment & project workflow

```
git commit → push origin/main → pull on EC2
→ docker compose -f backend/docker-compose.aws.yml up -d --build
→ nginx serves static/ + proxies API; RDS PostgreSQL is the data store
→ backups: RDS automated/manual snapshots · monitoring: CloudWatch alarms
```

_End of flow doc — every workflow maps to pages listed in `testing.md`._