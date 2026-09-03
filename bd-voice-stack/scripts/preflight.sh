#!/usr/bin/env bash
# T0 acceptance. Run on the VPS. Exit 0 = ready.
set -u
fail=0
say(){ printf '%s\n' "$*"; }
grep -q 'bookworm' /etc/os-release || { say "FAIL: not Debian 12"; fail=1; }
ip=$(curl -s --max-time 8 ifconfig.me || true)
cc=$(curl -s --max-time 8 "https://ipinfo.io/${ip}/country" | tr -d '\n' || true)
[ "$cc" = "BD" ] || { say "FAIL: public IP $ip country=$cc (must be BD for IPTSP)"; fail=1; }
[ "$(nproc)" -ge 2 ] || { say "FAIL: need 2+ vCPU"; fail=1; }
[ "$(free -m | awk '/Mem:/{print $2}')" -ge 3500 ] || { say "FAIL: need 4GB+ RAM"; fail=1; }
[ "$(df -m / | awk 'NR==2{print $4}')" -ge 20000 ] || { say "FAIL: need 20GB+ free disk"; fail=1; }
[ -f /opt/bd-voice-stack/deploy/answers.env ] || { say "FAIL: deploy/answers.env missing"; fail=1; }
grep -q CHANGE_ME /opt/bd-voice-stack/deploy/answers.env 2>/dev/null && { say "FAIL: answers.env still has CHANGE_ME"; fail=1; }
[ $fail -eq 0 ] && say "PREFLIGHT OK: ip=$ip country=$cc"
exit $fail
