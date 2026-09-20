#!/usr/bin/env bash
# bd-voice-stack - deploy from GitHub on the Hostinger VPS, same shape as rentjagat:
#   ssh root@72.62.213.196 'bash /root/bd-voice-stack/scripts/vps-deploy.sh'
# GitHub is the source of truth. .env, deploy/trunks.csv secrets and asterisk/etc never go to git.
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT=$(pwd)

echo "── git pull ──"
git pull --ff-only

echo "── checks ──"
[ -f .env ] || { echo ".env missing: cp deploy/env.example .env and fill it"; exit 1; }
if grep -q CHANGE_ME .env; then echo ".env still has CHANGE_ME:"; grep -n CHANGE_ME .env; exit 1; fi
docker compose version >/dev/null

echo "── render asterisk config ──"
python3 scripts/render_conf.py
mkdir -p data/recordings data/astdb data/postgres logs/asterisk
# the asterisk container runs as uid of user 'asterisk' created in the image; make the writable dirs open to it
chmod 777 data/recordings data/astdb logs/asterisk

echo "── build + up ──"
docker compose up -d --build

echo "── database schema (idempotent) ──"
for i in $(seq 1 20); do
  docker compose exec -T db pg_isready -U aibridge -d aibridge >/dev/null 2>&1 && break; sleep 2
done
docker compose exec -T db psql -U aibridge -d aibridge -v ON_ERROR_STOP=1 -q -f /docker-entrypoint-initdb.d/01_schema.sql

echo "── reload asterisk with the fresh config ──"
sleep 5
docker compose exec -T asterisk asterisk -rx "core reload" || true

echo "── health ──"
sleep 5
bash scripts/healthcheck.sh || true
echo "DEPLOY SESH"
