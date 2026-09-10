# HeavenLease — Broker-free Rental Platform (India)

Full-stack rental marketplace. Tenants find & rent homes directly from verified
owners; owners manage listings, applications, leases, rent, maintenance and
escrow — all online. Live: **https://heavenlease.in**

## Tech stack

| Layer | Technology |
|---|---|
| Backend | Spring Boot 3.3.2 · Java 17 · Maven (20 REST controllers, 14 services) |
| Frontend | 107 static HTML pages · shared `styles.css` · JS under `static/js/` (`api.js` API client, `core.js` shared UI, `pages/*.js` modules) — zero inline `<script>` |
| Database | PostgreSQL (AWS RDS, prod) · H2 in-memory (tests) · DynamoDB (counters) |
| Auth | JWT + BCrypt · email OTP · phone OTP · Google login · reCAPTCHA v3 · login lockout |
| Payments | Razorpay (UPI / cards / netbanking) · server-side signature verify · escrow · invoices · subscriptions |
| Realtime | STOMP WebSocket (`/ws`) for chat + notification bell |
| Deploy | Docker Compose + nginx (HTTPS, clean URLs) on AWS EC2 |

## Repository layout

```
static/            Frontend pages (public/authenticated) + shared JS/CSS
backend/           Spring Boot app (controllers, services, models, security, AWS)
  docker-compose.aws.yml   production stack (backend + nginx)
  .env.aws.example         env template — copy to .env.aws and fill real secrets locally
  db/migration/            SQL migrations (apply before first boot)
```

## Run locally

Requires **Java 17** and **Maven 3.9+**.

```bash
cd backend
mvn spring-boot:run        # API on http://localhost:8080
```

Serve `static/` from any static server (or the included nginx config); pages call
`/api/*` on the same origin.

**Tests** (H2 in-memory, no external credentials — runs green on a fresh clone):

```bash
cd backend && mvn test     # 78 tests, 0 failures
```

## Production deployment (EC2 + RDS Postgres)

1. **Secrets never live in git.** Copy `backend/.env.aws.example` → `backend/.env.aws`
   on the server and fill in RDS, JWT, AWS SES/SNS, Google, reCAPTCHA and Razorpay values.
2. One-time server setup: install Docker + compose plugin, stop old web servers on
   80/443, obtain a Let's Encrypt cert for the domain.
3. **Before first boot**, apply pending DB migrations (prod uses `ddl-auto: validate`
   and will not start until schema objects exist):

   ```bash
   psql "postgresql://<DB_USER>:<DB_PASS>@<DB_HOST>:5432/<DB_NAME>" \
     -f backend/db/migration/V20260911__heavenlease_two_factor.sql
   ```

4. **Launch** (first build takes 3–6 min; nginx starts only after backend is healthy):

   ```bash
   cd backend
   docker compose -f docker-compose.aws.yml --env-file .env.aws up -d --build
   ```

**Routine re-deploy after every push:**

```bash
cd /opt/heavenlease && git pull origin main
cd backend && docker compose -f docker-compose.aws.yml --env-file .env.aws up -d --build
```

**Smoke test:**

```bash
curl -s https://<your-domain>/api/health        # {"status":"UP",...}
# browser: signup → login → dashboard → property → payment → chat
```

## Architecture in one paragraph

`Browser → nginx (TLS, clean URLs, static) → /api/* & /ws proxied to Spring Boot →
Spring Security (rate limit → JWT → roles TENANT / OWNER / ADMIN / VERIFIED_OWNER) →
Controller → Service → Repository (RDS / DynamoDB) → JSON`. A 401 auto-logs the
user out; clean URLs map `page.html` → `page`; unknown paths → `/404`. Only `index`
is public — everything else is behind authentication.

Key features: property search/favorites/compare/map, tour bookings, rental
applications → leases with e-signing + renewal reminders, Razorpay Access Pass &
Owner Plus subscriptions, escrow (hold / two-party release / dispute), maintenance
requests, direct chat over WebSocket, documents & tenant screening, owner identity
verification, admin dashboard (users, properties, integrations, stats), email &
authenticator 2FA.

## Troubleshooting (most common)

| Symptom | Fix |
|---|---|
| `502 Bad Gateway` on https | backend still booting — wait for `healthy`; nginx retries automatically |
| backend container exits / restarts | `docker compose logs --tail=200 backend` → usually DB or JWT config |
| DB connection failed | check `DB_HOST/DB_PORT/DB_NAME/DB_USERNAME/DB_PASSWORD` in `.env.aws`; confirm the RDS security group allows the EC2 IP on 5432 |
| SSL cert expired / invalid | `certbot renew`; ensure DNS A records point at the EC2 IP for apex + `www` |

## Security notes

- `backend/.env.aws`, `.pem`/`.key` files and any `credentials*.json` are git-ignored —
  never commit or hand them over with the repo.
- Rotate `JWT_SECRET` / `APP_ENCRYPTION_KEY` / `ADMIN_PASSWORD` if leaked; keep RDS in a
  locked-down security group.

## License

Proprietary. All rights reserved. © 2026 HeavenLease.