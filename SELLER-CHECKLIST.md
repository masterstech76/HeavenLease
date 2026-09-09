# HeavenLease — Seller Checklist (₹7 Lakh Sale)

> Purpose: complete the security + ownership steps before showing/handing over
> the project to a buyer. Tick each item as you finish it.

---

## 🔴 URGENT — do first (security)

- [ ] **Rotate the RDS `DB_PASSWORD`** (it was shared in a chat — treat as exposed):
  1. AWS Console → RDS → `heavenlease-db` → **Modify** → set a new strong password
  2. Update `backend/.env.aws` on the EC2 server (and locally)
  3. Restart backend:
     ```bash
     cd /opt/heavenlease/backend
     docker compose -f docker-compose.aws.yml --env-file .env.aws up -d backend
     ```
- [ ] **Verify you can log in to the AWS account** that owns the infra:
  - Account ID: **965472235182**
  - Region: `ap-south-1` · EC2 instance `i-0d96cbc210b2a1c21` (t3.micro)
  - RDS: `heavenlease-db` · Services in use: EC2, RDS, SES, (SNS/DynamoDB optional)
- [ ] **Verify you can log in to Hostinger** (domain registrar for `heavenlease.in`, registered 25-Aug-2026)

---

## ✅ Before showing/selling to a buyer

- [ ] **Rotate app secrets** (run on your PC, then update the server file):
  ```bash
  openssl rand -base64 48   # -> new JWT_SECRET
  openssl rand -base64 32   # -> new APP_ENCRYPTION_KEY
  ```
  - [ ] Update `JWT_SECRET` + `APP_ENCRYPTION_KEY` in server `/opt/heavenlease/backend/.env.aws`
  - [ ] Change `ADMIN_PASSWORD` too, then restart backend (command above)
- [ ] **Never ship `backend/.env.aws`** (it is git-ignored — correct). Give the buyer `backend/.env.aws.example` instead.
- [ ] Decide the exact offer contents:

| Option | What the buyer gets | You transfer |
|---|---|---|
| **A. Code + runbook (recommended)** | Full repo, DEPLOY.md, architecture docs, README, live demo access | Nothing on your AWS/Domain — buyer deploys on their own server |
| **B. Code + domain** | Option A + control of heavenlease.in | Push domain to buyer's Hostinger account |
| **C. Full stack as-is** | Option B + the running EC2/RDS/AWS stack | AWS account/root login, RDS snapshot, EC2 key, billing changes |

- [ ] Prepare demo accounts for the buyer (a sample TENANT + OWNER + the admin login they will create).
- [ ] **Demo data switch**: the only demo content is `static/demo/demo-data.js` (featured properties, application-history/status samples, add-property grid, careers jobs). Deleting that one file makes every page fall back to the live API — zero dead references (verified by `python verify.py --no-demo`).
- [ ] **Architecture note for buyer**: 107 static HTML pages, one shared `styles.css`, all JS under `static/js/` (`js/api.js`, `js/core.js`, 93 `js/pages/*.js`) — zero inline `<script>` in any page.

---

## 📦 Buyer handover pack (create these)

- [ ] `DEPLOY.md` — already written, give as-is
- [ ] `backend/.env.aws.example` — fill in real host but blanks for secrets
- [ ] Architecture summary — `flow.md`, `testing.md`, `README.md`
- [ ] 1-page **"What is HeavenLease"** overview + screenshot links (optional)
- [ ] Contact/admin support note (who to call if prod breaks)

---

## 🔁 Post-sale (optionally help buyer with)

- [ ] DNS: update A record if moving off EC2 (`heavenlease.in` / `www` → 13.234.165.171 today)
- [ ] SSL: regenerate Let's Encrypt certs on the new server
- [ ] RDS: take a final snapshot and share credentials only if Option C
- [ ] Remove your SSH key from the server after handover / terminate the instance after buyer confirms

---

---

## ✅ VERIFIED 09-Sep-2026 — ownership evidence (read-only API checks)

### AWS account **965472235182** (IAM user `AWS` runs the app) contains:
- **EC2** `i-0d96cbc210b2a1c21` → 13.234.165.171 (t3.micro, `running`) — the web server
- **RDS** `heavenlease-db` → heavenlease-db.cfkksyioijq8.ap-south-1.rds.amazonaws.com (Postgres, `available`)
- **Route53** public hosted zone: `heavenlease.in.` (controls DNS)
- **DynamoDB** table: `HeavenLease_Counters`
- **SES** verified sender: `masterstech98@gmail.com` (email OTP needs this verified)

### Domain `heavenlease.in` (registrar side)
- Registered **25-Aug-2026** via **Hostinger** (registrant in Maharashtra, India) · expires 25-Aug-2027
- DNS delegated to Route53 → same AWS account above (single-owner setup)

### To fully prove ownership (manual login — only you can do these):
- [ ] **AWS Console**: sign in at `https://965472235182.signin.aws.amazon.com/console`
      (root: the email that received the Aug-2026 "Welcome to Amazon Web Services" mail —
      IAM user: username `AWS` + its password). You should see EC2/RDS/Route53/DynamoDB.
- [ ] **Hostinger**: log in at `https://hpanel.hostinger.com` → **Domains** → `heavenlease.in`

> Note: the PC's `~/.aws/credentials` key (16-Aug-2026) is a *different* key than the one
> in production `.env.aws` (IAM user `AWS`) — both belong to the same era of setup, but the
> **production copy is the one that matters** and must not be lost.

_Keep in sync with `DEPLOY.md`, `flow.md`, `testing.md`, `README.md`._