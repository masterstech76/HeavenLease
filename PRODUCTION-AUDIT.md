# HeavenLease Production Audit & Fixes

Audit date: 2026-09-10

## Fixed

### 1. Global CSS / dark-mode breakage
- Restored `--white` to true white in dark mode so primary buttons and light controls keep readable contrast.
- Added dark-mode overrides for the body overlay, navbar, page headers, dropdowns, settings menus, and translucent page surfaces.
- Removed the global mobile rule that forced every `.btn`, `.btn-primary`, `.btn-secondary`, and `.btn-auth` to `width:100%`. This was causing distorted action rows and button layouts.
- Kept full-width behavior only where it is intentional: block buttons and authentication form buttons.
- CSS was parsed with `tinycss2`: no stylesheet parse errors detected.

### 2. Nginx routing / proxy precedence
Nginx regex locations can override ordinary prefix locations. The API, uploads, and WebSocket locations now use `^~`:
- `/api/`
- `/uploads/`
- `/ws`

This prevents image/font/static regex handlers from accidentally intercepting API, upload, or WebSocket requests.

### 3. Public/private page access
The frontend route guard previously marked many marketing/discovery pages as public even though the intended product rule is:
`index -> auth -> authenticated application`.

The public list now contains only:
- `index`
- authentication pages needed to establish/recover a session
- `404`

All other pages fall through to authentication protection.

### 4. OTP production safety
The SMS service previously defaulted the on-screen OTP preview to enabled when the property was missing. The default is now disabled:
`app.otp.self-hosted-preview=false`

A real production environment should use a real SMS provider and never expose an OTP in an API response or notification UI unless this fallback is explicitly enabled for a controlled environment.

### 5. CORS robustness
Allowed origins are now trimmed and blank entries are ignored. This avoids failures caused by common comma-separated environment variable formatting such as:
`https://heavenlease.in, https://www.heavenlease.in`

## Validation performed

- 97 JavaScript files checked with Node syntax validation: **0 syntax failures**.
- 107 HTML pages inspected: **0 duplicate IDs / missing titles** in the automated structural check.
- Local asset references checked: **0 missing referenced CSS/JS/image/font assets**.
- 84 extensionless HTML routes referenced by pages: **0 unresolved routes**.
- Backend production profile uses `ddl-auto: validate`, which is appropriate for production schema safety.
- **11-Sep-2026 update (supersedes the Maven note below):** Maven 3.9.16 IS installed and the full suite was executed successfully —
  `mvn test` → **Tests run: 78, Failures: 0, Errors: 0, Skipped: 0 → BUILD SUCCESS**, and
  `mvn package` produced `backend/target/HeavenLease-backend-1.0.0.jar`.
  (This required fixing 3 compile errors introduced after the 10-Sep audit: `WebSocketAuthInterceptor`'s
  `Principal.isAuthenticated()` misuse and a missing `PaymentRepository.findByOwnerId`, plus updating 5
  stale payment/escrow tests to the current server-authoritative stored-order + property-deposit flow.)
- `python verify.py` and `python verify.py --no-demo`: **checked 107 html files, 96 js files; failed=0** (11-Sep-2026).

> Previous audit note (10-Sep-2026): "Maven test suite could not be executed in this environment because
> Maven is not installed (`mvn: command not found`)." — outdated, see the 11-Sep-2026 update above.

## Remaining production verification

Before deploying, run:

```bash
cd backend
mvn test

docker compose -f docker-compose.aws.yml --env-file .env.aws up -d --build

curl -fsS https://heavenlease.in/api/health
```

Then browser-test at minimum:
1. `/` -> login/signup
2. signup -> email OTP -> dashboard
3. login -> dashboard
4. expired JWT -> login
5. tenant vs owner route protection
6. property photo upload/display
7. documents upload/download authorization
8. Razorpay order -> server-side payment verification
9. WebSocket messaging
10. mobile widths 320 / 375 / 414 / 768 px
11. light/dark theme on auth, dashboard, property, lease and payment pages
12. `/api/*`, `/uploads/*`, and `/ws` through nginx

## Product architecture rule

The intended navigation/security model is:

`index.html (only public landing page)`
`-> login / signup / password recovery`
`-> authenticated session`
`-> verification / role-aware application`
`-> dashboard`
`-> tenant / owner / admin workflows`

`home.html` is an authenticated application hub, not the public landing page.
