#!/usr/bin/env bash
# DriverJagat - GitHub theke deploy. VPS e chale:
#   ssh root@72.62.213.196 'bash /root/driverjagat/scripts/vps-deploy.sh'
#
# Mul kotha (RentJagat D-025 er niyom): GitHub i SOURCE OF TRUTH.
# Local theke scp/tar r na - push koro, tarpor ei script pull kore
# chalu kore. .env git e NAI (gopon) - VPS er /root/driverjagat/.env
# e i thake, git pull take chhoy na.
#
# Repo: driverjagat/ folder ta ekhon ruhulamin0001/emo-uk-site er
# bhitore (branch claude/driverjagat-platform). Nijer PRIVATE repo
# te sorano hole niche r APP_DIR ta root e hobe - docs/DEPLOY.md.
set -euo pipefail
cd /root/driverjagat

echo "── git pull ──"
git pull --ff-only

echo "── build + up ──"
# Alada repo hole "driverjagat/" subfolder thakbe na - tokhon
# sudhu `cd /root/driverjagat` i jothesto.
APP_DIR="."
if [ -f driverjagat/docker-compose.yml ]; then APP_DIR="driverjagat"; fi
cd "$APP_DIR"
docker compose up -d --build

echo "── health ──"
sleep 10
docker ps --filter name=driverjagat --format '{{.Names}} {{.Status}}'
curl -fsS -o /dev/null -w 'home: %{http_code}\n' https://driver.jagatitlimited.com/
echo "DEPLOY SESH"
