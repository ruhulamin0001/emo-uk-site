#!/usr/bin/env bash
# Optional, once: fail2ban on the HOST watching the asterisk security log that the container
# writes to ./logs/asterisk/security. Bans go into the DOCKER-USER chain, otherwise they would not
# apply to published container ports.
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT=$(pwd)
apt-get install -y fail2ban >/dev/null
cat > /etc/fail2ban/jail.d/bd-voice-stack.local <<J
[asterisk-bdvs]
enabled  = true
filter   = asterisk
logpath  = $ROOT/logs/asterisk/security
maxretry = 5
findtime = 600
bantime  = 86400
action   = iptables-allports[name=asterisk-bdvs, chain=DOCKER-USER]
J
systemctl restart fail2ban
fail2ban-client status asterisk-bdvs
