#!/usr/bin/env bash
# T0 acceptance on the Hostinger VPS. Exit 0 = ready to deploy.
set -u
cd "$(dirname "$0")/.."
fail=0
say(){ printf '%s\n' "$*"; }
command -v docker >/dev/null || { say "FAIL: docker missing"; fail=1; }
docker compose version >/dev/null 2>&1 || { say "FAIL: docker compose v2 missing"; fail=1; }
command -v python3 >/dev/null || { say "FAIL: python3 missing (apt install python3)"; fail=1; }
docker ps --format '{{.Names}} {{.Image}}' | grep -qi traefik && say "info: Traefik is running on this host, we do not touch 80/443" || say "info: no Traefik container seen"
if ss -lun 2>/dev/null | grep -q ':5060 '; then say "FAIL: something already listens on udp/5060 on the host"; fail=1; fi
[ -f .env ] || { say "FAIL: .env missing (cp deploy/env.example .env)"; fail=1; }
grep -q CHANGE_ME .env 2>/dev/null && { say "FAIL: .env still has CHANGE_ME"; fail=1; }
[ "$(free -m | awk '/Mem:/{print $2}')" -ge 3500 ] || say "WARN: under 4GB RAM, the Asterisk image build is slow, build once and keep the image"
[ "$(df -m / | awk 'NR==2{print $4}')" -ge 8000 ] || { say "FAIL: need 8GB+ free disk for the build"; fail=1; }
ip=$(curl -s --max-time 8 ifconfig.me || true)
cc=$(curl -s --max-time 8 "https://ipinfo.io/${ip}/country" | tr -d '\n' || true)
if [ "$cc" != "BD" ]; then
  say "WARN: public IP $ip country=$cc is not Bangladesh. Some IPTSP operators reject foreign IPs."
  say "      The BD office must confirm with the operator that registration from this IP is allowed."
fi
grep -q "^PUBLIC_IP=$ip" .env 2>/dev/null || say "WARN: PUBLIC_IP in .env should be $ip"
[ $fail -eq 0 ] && say "PREFLIGHT OK: ip=$ip country=$cc"
exit $fail
