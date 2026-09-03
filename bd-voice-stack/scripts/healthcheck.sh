#!/usr/bin/env bash
# exit 0 when everything is healthy; prints one line per check
fail=0
c(){ if eval "$2" >/dev/null 2>&1; then echo "OK   $1"; else echo "FAIL $1"; fail=1; fi; }
c "asterisk running"      "systemctl is-active asterisk"
c "ai-bridge running"     "systemctl is-active ai-bridge"
c "audiosocket port 9092" "ss -ltn | grep -q 9092"
reg=$(asterisk -rx 'pjsip show registrations' 2>/dev/null | grep -c Registered); tot=$(awk 'NR>1' /opt/bd-voice-stack/deploy/trunks.csv | wc -l)
c "trunks registered $reg/$tot" "[ $reg -ge $tot ]"
c "fail2ban asterisk jail"  "fail2ban-client status asterisk"
c "ufw active"             "ufw status | grep -q 'Status: active'"
c "wireguard up"           "wg show wg0"
c "disk < 85%"             "[ $(df / | awk 'NR==2{print $5+0}') -lt 85 ]"
exit $fail
