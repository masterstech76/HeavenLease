# HeavenLease — EC2 Deployment Runbook (Ubuntu)

Goal: replace the OLD website on the EC2 server with the NEW
HeavenLease stack (nginx + Spring Boot in Docker, RDS PostgreSQL).

Server profile used below: **Ubuntu** (`ubuntu@ip-172-31-36-126`).
If yours is Amazon Linux 2023, use the AL2023 commands in the notes.

---

## 0. Prerequisites (one-time, on your PC)

From your local machine you need:
- this repo cloned on the server (`git clone`),
- the real **`backend/.env.aws`** (secrets, NOT in git) copied via `scp`,
- your SSH key / IP in hand.

Your current `backend/.env.aws` already has real values (RDS, JWT, AWS SES).
Do NOT commit it — the repo is **public**.

---

## 1. Get the code on the server

```bash
cd /opt
sudo git clone https://github.com/masterstech76/HeavenLease.git heavenlease
sudo chown -R ubuntu:ubuntu /opt/heavenlease
cd /opt/heavenlease
git checkout main
git log --oneline -1
```

Now **copy the real secrets file from your PC** (run in **PowerShell**, not on the server):

```powershell
scp -i "c:\Users\techm\OneDrive\Desktop\Renatal Home\heavenlease-prod.pem" `
    "c:\Users\techm\OneDrive\Desktop\Renatal Home\backend\.env.aws" `
    ubuntu@<EC2_PUBLIC_IP>:/opt/heavenlease/backend/.env.aws
```

> If you don't have the file, instead: `cp backend/.env.aws.example backend/.env.aws`
> then fill every value in `backend/.env.aws` with a text editor.

---

## 2. One-time EC2 setup (docker + compose plugin)

```bash
# ---- Ubuntu / Debian ----
sudo apt update
sudo apt install -y docker.io docker-compose-plugin git
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
# IMPORTANT: log OUT and back IN (or: newgrp docker) for the group to apply.

docker --version
docker compose version
```

> Amazon Linux 2023 instead:
> `sudo dnf install -y docker git && sudo systemctl enable --now docker && sudo usermod -aG docker $USER`

---

## 3. Free ports 80/443 (stop the OLD website)

```bash
# Stop host-level web servers that used 80/443
sudo systemctl stop nginx httpd apache2 2>/dev/null
sudo systemctl disable nginx httpd apache2 2>/dev/null

# If the old site ran in Docker, record and stop those containers
docker ps --format 'table {{.Names}}\t{{.Ports}}'
docker stop <OLD_CONTAINER_NAME> 2>/dev/null

# Confirm ports are free
sudo ss -tulpn | grep -E ':(80|443|8080)' || echo "ports 80/443/8080 are free"
```

---

## 4. Make sure TLS certs exist (Let's Encrypt)

The nginx SSL config (`backend/nginx/app-ssl.conf`) reads certs from
`/etc/letsencrypt/live/heavenlease.in/`. Check they exist:

```bash
sudo ls -la /etc/letsencrypt/live/heavenlease.in/
```

If missing (never issued / expired / old cert used a different name):

```bash
# Stops anything on 80 first — the standalone challenge needs the port free
sudo apt install -y certbot
sudo certbot certonly --standalone -d heavenlease.in -d www.heavenlease.in --email you@example.com --agree-tos -n
```

> certbot auto-renews — add: `sudo systemctl enable certbot.timer` (Ubuntu) or a cron `15 3 * * * root certbot renew --quiet` (AL2023).
> When renewing, restart nginx: `sudo docker exec HeavenLease-nginx nginx -s reload`
---

## 5. Launch the NEW website

```bash
cd /opt/heavenlease/backend
docker compose -f docker-compose.aws.yml --env-file .env.aws up -d --build
```

What happens:
- `backend` builds the Spring Boot jar inside Docker (`target/com.heavenlease...jar`), then starts with `SPRING_PROFILES_ACTIVE=prod` → connects to **RDS PostgreSQL via TLS** (`sslmode=require`).
- nginx starts **only after** the backend is `healthy` (`/api/health`).
- `mem_limit: 768m` and a 384 MB heap — keep the EC2 instance ≥ 1 GB RAM.

First build takes **3–6 minutes**. Show progress / logs:

```bash
cd /opt/heavenlease/backend
docker compose -f docker-compose.aws.yml --env-file .env.aws logs --tail=200 -f backend
```

---

## 6. Verify

```bash
cd /opt/heavenlease/backend
docker compose -f docker-compose.aws.yml --env-file .env.aws ps
# both Containers: Up / "healthy"

# Direct backend health
curl -s http://localhost:8080/api/health        # {"status":"UP",...}

# Through nginx over the internet
curl -sI https://heavenlease.in                 # 200 + TLS
curl -s  https://heavenlease.in/api/health      # {"status":"UP",...}

# Browser smoke test (manual):
#   signup → login → dashboard → properties → payment flow
```

---

## 7. Routine re-deploy (after every git push)

```bash
cd /opt/heavenlease
git pull origin main
cd backend
docker compose -f docker-compose.aws.yml --env-file .env.aws up -d --build
docker image prune -f    # optional: free disk space
```

---

## 8. Rollback (go back to the OLD website)

```bash
# Backend was backed up in Phase 0 from the previous runbook.
cd /opt/heavenlease/backend
docker compose -f docker-compose.aws.yml --env-file .env.aws down

# Restore the old static site (from your Phase-0 tarball)
sudo rm -rf /var/www/html
sudo tar xzf /opt/backups/old-website-<timestamp>.tar.gz -C /    # if it was /var/www/html
# or start whatever web server the old site used:
sudo systemctl start nginx httpd apache2   # the one that was running before
```

---

## 9. Troubleshooting

| Symptom | Fix |
|---|---|
| `502 Bad Gateway` on https | backend still booting — wait for `healthy`; nginx retries automatically |
| backend container exits / restarts | `docker compose logs --tail=200 backend` → usually DB or JWT config |
| DB connection failed | check `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD` in `.env.aws`; confirm the RDS **Security Group** allows the EC2 instance's IP on **5432** |
| Port 80/443 in use at startup | old nginx/apache still running — see section 3 |
| SSL cert expired / invalid | `certbot renew`; ensure DNS A records point at the EC2 IP for both `heavenlease.in` and `www.heavenlease.in` |
| Old site still loads after deploy | your browser may cache — hard refresh (Ctrl+Shift+R); also check `docker ps` that the old container is gone |

---

## Security notes
- `backend/.env.aws` and `heavenlease-prod.pem` stay on the server only — they are git-ignored and must never be committed.
- This repo is **public** on GitHub — never add real keys/secrets to any committed file.
- Rotate `JWT_SECRET` after a leak. Keep RDS in a private subnet / locked-down SG.
- CloudWatch / uptime monitors can hit `https://heavenlease.in/api/health` every minute.

_End of runbook — pairs with `flow.md` (architecture) and `testing.md` (features)._