@echo off
REM ============================================================
REM HeavenLease — CLEAN DEPLOY v2 (run from project root on your PC)
REM 1) pushes repo 2) SSHs to EC2 3) pulls, wipes DB fresh,
REM    4) builds & starts backend+nginx, 5) verifies health.
REM Edit the three values below.
REM ============================================================
set LOCAL_REPO=c:\Users\techm\OneDrive\Desktop\Renatal Home
set EC2_IP=13.234.165.171
set PEM_PATH=C:\path\to\heavenlease-prod.pem     REM set your real .pem path
set EC2_USER=ubuntu

echo [1/6] Pull remote repo state
cd /d "%LOCAL_REPO%"
git pull origin main

echo [2/6] SSH into EC2 and fetch latest code
ssh -i "%PEM_PATH%" -o StrictHostKeyChecking=accept-new %EC2_USER%@%EC2_IP% ^
  "cd /opt/heavenlease && sudo chown -R %EC2_USER%:%EC2_USER% . && git pull origin main || (git clone https://github.com/masterstech76/HeavenLease.git . && git checkout main)"

echo [3/6] Copy real secrets to server
scp -i "%PEM_PATH%" "%LOCAL_REPO%\backend\.env.aws" %EC2_USER%@%EC2_IP%:/opt/heavenlease/backend/.env.aws

echo [4/6] WIPE the database fresh (drop schema + recreate -> NO old users)
ssh -i "%PEM_PATH%" %EC2_USER%@%EC2_IP% ^
  "cd /opt/heavenlease/backend && set -a && . ./.env.aws && set +a && docker run --rm --network host -e PGPASSWORD="$DB_PASSWORD" postgres:16-alpine psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_NAME" -c 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;'"

echo [5/6] Build + start containers
ssh -i "%PEM_PATH%" %EC2_USER%@%EC2_IP% ^
  "cd /opt/heavenlease/backend && docker compose -f docker-compose.aws.yml --env-file .env.aws up -d --build"

echo [6/6] Verify
timeout /t 120 >nul
ssh -i "%PEM_PATH%" %EC2_USER%@%EC2_IP% "curl -s http://localhost:8080/api/health"
echo.
echo Done. Open https://heavenlease.in  (hard refresh to clear cache)