#!/usr/bin/env bash
# usage: add_vpn_peer.sh <name> <ip-last-octet>   e.g. add_vpn_peer.sh staff1 3
set -euo pipefail
source /opt/bd-voice-stack/deploy/answers.env
n=$1; o=$2; cd /etc/wireguard; umask 077
wg genkey | tee "$n.key" | wg pubkey > "$n.pub"
printf '\n[Peer]\n# %s\nPublicKey = %s\nAllowedIPs = 10.8.0.%s/32\n' "$n" "$(cat $n.pub)" "$o" >> wg0.conf
wg syncconf wg0 <(wg-quick strip wg0)
printf '[Interface]\nPrivateKey = %s\nAddress = 10.8.0.%s/24\nDNS = 1.1.1.1\n\n[Peer]\nPublicKey = %s\nEndpoint = %s:51820\nAllowedIPs = 10.8.0.0/24\nPersistentKeepalive = 25\n' "$(cat $n.key)" "$o" "$(cat server.pub)" "$VPS_IP"
