#!/usr/bin/env bash
# T9: restrict SIP/RTP to operator IPs + VPN, fail2ban, retention, ISD block check
set -euo pipefail
R=/opt/bd-voice-stack
source $R/deploy/answers.env
ufw delete allow 5060/udp || true
ufw delete allow 10000:20000/udp || true
for h in $(awk -F, 'NR>1{print $4}' $R/deploy/trunks.csv | sort -u); do
  for ip in $(getent ahostsv4 "$h" | awk '{print $1}' | sort -u); do
    ufw allow from "$ip" to any port 5060 proto udp
    ufw allow from "$ip" to any port 10000:20000 proto udp
  done
done
ufw allow from "$VPN_SUBNET" to any port 5060 proto udp
ufw allow from "$VPN_SUBNET" to any port 10000:20000 proto udp
# BD office static IP (optional)
[ -n "${OFFICE_IP:-}" ] && { ufw allow from "$OFFICE_IP" to any port 5060 proto udp; ufw allow from "$OFFICE_IP" to any port 10000:20000 proto udp; }
ufw reload
cat > /etc/fail2ban/jail.d/asterisk.local <<'J'
[asterisk]
enabled = true
port = 5060,5061
logpath = /var/log/asterisk/full
maxretry = 5
findtime = 600
bantime = 86400
J
systemctl restart fail2ban
# recordings retention 90 days
echo '0 3 * * * root find /var/spool/asterisk/monitor -type f -name "*.wav" -mtime +90 -delete' > /etc/cron.d/recordings-retention
# ISD block sanity: no outbound pattern starting with 00 or + except +880
if mysql -N asterisk -e "SELECT match_pattern_pass FROM outbound_route_patterns" | grep -Eq '^(00|\+[^8])'; then echo "FAIL: ISD pattern present"; exit 1; fi
asterisk -rx "pjsip set logger off" || true
bash $R/scripts/healthcheck.sh
echo "06_harden OK"
