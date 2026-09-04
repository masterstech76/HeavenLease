#!/usr/bin/env bash
# ============================================================================
# HeavenLease — one-shot EC2 provisioner (Ubuntu/Debian)
#
# DOES EVERYTHING in one run:
#   [1] clone/pull the repo into /opt/heavenlease
#   [2] verify backend/.env.aws exists (created separately, never committed)
#   [3] install Docker + compose plugin if missing
#   [4] stop old website (host nginx/apache/httpd + containers on :80/:443)
#   [5] check (or best-effort issue) Let's Encrypt certs for heavenlease.in
#   [6] build & launch the stack (backend + nginx)
#   [7] wait for /api/health and print status
#
# Usage:  bash <(curl -sL https://raw.githubusercontent.com/masterstech76/HeavenLease/main/deploy-setup.sh)
# ============================================================================
set -uo pipefail

REPO_DIR=/opt/heavenlease
BACKEND_DIR=$REPO_DIR/backend
GIT_URL=https://github.com/masterstech76/HeavenLease.git
DOMAIN=heavenlease.in
export DEBIAN_FRONTEND=noninteractive

log() { printf '\n==> [%s] %s\n' "$1" "$2"; }

# --- [1] code ---
log "1/7" "Code (clone/pull into $REPO_DIR)"
if [ ! -d "$REPO_DIR/.git" ]; then
  sudo mkdir -p "$REPO_DIR"
  sudo git clone "$GIT_URL" "$REPO_DIR" || exit 1
  sudo chown -R "$(whoami)" "$REPO_DIR"
else
  sudo git -C "$REPO_DIR" pull --ff-only origin main || echo "WARN: git pull failed (continuing with existing code)"
fi

# --- [2] env file ---
log "2/7" "Check backend/.env.aws"
if [ ! -f "$BACKEND_DIR/.env.aws" ]; then
  echo "ERROR: $BACKEND_DIR/.env.aws does not exist."
  echo "Create it first, then re-run this script. See DEPLOY.md."
  exit 1
fi
sudo chmod 600 "$BACKEND_DIR/.env.aws"
echo "OK: .env.aws present ($(grep -c '=' "$BACKEND_DIR/.env.aws") variables)"

# --- [3] docker ---
log "3/7" "Docker"
if ! command -v docker >/dev/null 2>&1; then
  sudo apt-get update -y
  sudo apt-get install -y docker.io docker-compose-plugin git
  sudo systemctl enable --now docker
fi
if ! docker compose version >/dev/null 2>&1; then
  sudo apt-get update -y
  sudo apt-get install -y docker-compose-plugin
fi
sudo systemctl start docker 2>/dev/null || true
echo "docker: $(docker --version 2>/dev/null || sudo docker --version)"
echo "compose: $(docker compose version 2>/dev/null || sudo docker compose version)"

# --- [4] free ports / stop old site ---
log "4/7" "Stop old website (free :80/:443)"
sudo systemctl stop nginx apache2 httpd 2>/dev/null || true
sudo systemctl disable nginx apache2 httpd 2>/dev/null || true
for c in $(sudo docker ps -q --filter publish=80 2>/dev/null; sudo docker ps -q --filter publish=443 2>/dev/null; sudo docker ps -q --filter publish=8080 2>/dev/null); do
  echo "stopping old container: $c"
  sudo docker stop "$c" 2>/dev/null || true
done
echo "ports now: $(sudo ss -tulpn 2>/dev/null | grep -E ':(80|443|8080)' || echo '80/443/8080 free')"

# --- [5] TLS certs ---
log "5/7" "Let's Encrypt certs for $DOMAIN"
if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
  echo "OK: cert exists -> /etc/letsencrypt/live/$DOMAIN/fullchain.pem"
else
  echo "WARN: no cert yet, trying certbot (standalone)..."
  command -v certbot >/dev/null 2>&1 || sudo apt-get install -y certbot
  sudo certbot certonly --standalone -d "$DOMAIN" -d "www.$DOMAIN" \
       --non-interactive --agree-tos -m "admin@$DOMAIN" \
    && echo "OK: cert issued" \
    || echo "WARN: certbot failed — see DEPLOY.md section 4 to issue certs manually."
fi

# --- [6] compose up ---
log "6/7" "Build & launch stack"
cd "$BACKEND_DIR" || exit 1
sudo docker compose -f docker-compose.aws.yml --env-file .env.aws up -d --build

# --- [7] health ---
log "7/7" "Wait for /api/health"
for i in $(seq 1 48); do
  if curl -fsS http://localhost:8080/api/health >/dev/null 2>&1; then
    echo "BACKEND HEALTHY after ~$((i*5))s"; break
  fi
  sleep 5
done

echo
printf '%s\n' "------------------------- backend /api/health -------------------------"
curl -s http://localhost:8080/api/health || echo "(not healthy yet — run: sudo docker compose -f docker-compose.aws.yml --env-file .env.aws logs --tail=100 backend)"
printf '\n%s\n' "------------------------- docker compose ps ----------------------------"
cd "$BACKEND_DIR" || exit 1
sudo docker compose -f docker-compose.aws.yml --env-file .env.aws ps
echo
echo "DONE. Open: https://$DOMAIN"
echo "If nginx is not Up, wait ~1 min and re-run the ps line above."