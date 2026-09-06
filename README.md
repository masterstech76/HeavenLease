# HeavenLease — Broker-free Rental Platform (India)

Full-stack rental marketplace. Tenants find & rent homes directly from verified owners;
owners manage listings, applications, leases, rent, maintenance and escrow — all online.

## Tech stack

| Layer | Technology |
|---|---|
| Backend | Spring Boot 3.3.2 · Java 17 · Maven |
| Frontend | 110+ static HTML pages · shared styles.css / script.js / api.js |
| Database | PostgreSQL (AWS RDS, production) · H2 in-memory (tests) · DynamoDB (counters) |
| Auth | JWT + BCrypt · Email OTP (AWS SES) · Phone OTP · Google login · reCAPTCHA v3 · rate limiting |
| Payments | Razorpay (UPI / cards / netbanking) · server-side signature verification · escrow · invoices |
| Realtime | STOMP WebSocket (`/ws`) for chat + notification bell |
| Deploy | Docker Compose + nginx (HTTPS, clean URLs) on AWS EC2 → https://heavenlease.in |

## Features

- **Auth & profiles** — signup/login (email, phone OTP, Google), forgot/reset password, edit profile & avatar, account deactivate/delete.
- **Properties** — CRUD listings, search & filters (budget, BHK, comfort scores), favorites, compare, map, tours.
- **Applications & leases** — tour/application requests, owner review & approve, lease creation, e-signing, renewal reminders.
- **Payments** — Razorpay Access Pass & Owner Plus plans, escrow deposit flow (hold / two-party release / dispute), printable invoices.
- **Maintenance** — tenant request → owner queue (New/Start/Done/Cancel) with status notifications.
- **Messaging** — direct chat over WebSocket, unread + read states, notification bell.
- **Documents & screening** — upload/store/organise documents, tenant screening, owner verification.
- **Support & safety** — support tickets, property/user reports, feedback & reviews, admin dashboard (users, properties, owner-verification, integrations).

## Project layout

```
backend/            Spring Boot app (controllers, services, models, security, AWS)
  docker-compose.aws.yml   production stack (backend + nginx)
  .env.aws.example         production env template (fill real values locally)
static/             All frontend pages (public/authenticated), shared JS/CSS
flow.md             Page flow & workflow documentation
testing.md          Feature-by-feature page summary
DEPLOY.md           EC2 deployment runbook
```

## Local development

Requires Java 17 and Maven 3.9+.

```bash
cd backend
# optional: create .env with DB/JWT values (see application.yml)
mvn spring-boot:run
```

Serve the `static/` folder with any static server (or the included nginx config).
The API runs on `http://localhost:8080` and pages call `/api/*` on the same origin.

## Tests

```bash
cd backend
mvn test          # 76 tests — no external credentials required
```

The test profile (`application-test.yml`) uses an in-memory H2 database and test-only
keys, so the suite runs green on a fresh clone with no environment variables.

## Production deployment

See `DEPLOY.md` and `deploy-setup.sh`. The compose stack runs the backend with
`SPRING_PROFILES_ACTIVE=prod` and connects to AWS RDS PostgreSQL over TLS; nginx
serves the static site with HTTPS (Let's Encrypt) and clean URLs.

Required production secrets (never commit): `backend/.env.aws` — copy
`.env.aws.example`, fill in RDS, JWT, AWS SES/SNS, Google, reCAPTCHA and Razorpay values.

## License

Proprietary. All rights reserved. © 2026 HeavenLease.