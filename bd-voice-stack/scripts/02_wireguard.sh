#!/usr/bin/env bash
# T1 part 2: WireGuard server + first client (owner)
set -euo pipefail
source /opt/bd-voice-stack/deploy/answers.env
apt-get install -y wireguard qrencode
cd /etc/wireguard; umask 077
[ -f server.key ] || { wg genkey | tee server.key | wg pubkey > server.pub; }
[ -f owner.key ]  || { wg genkey | tee owner.key  | wg pubkey > owner.pub; }
cat > wg0.conf <<CONF
[Interface]
Address = 10.8.0.1/24
ListenPort = 51820
PrivateKey = $(cat server.key)

[Peer]
# owner laptop
PublicKey = $(cat owner.pub)
AllowedIPs = 10.8.0.2/32
CONF
systemctl enable --now wg-quick@wg0
systemctl restart wg-quick@wg0
# ufw "default deny incoming" also applies to wg0. Without this line the owner can reach
# nothing on 10.8.0.1 (no FreePBX admin, no SIP). Everything on the VPN side is trusted.
ufw allow in on wg0
wg show
cat > /root/owner-wg.conf <<CONF
[Interface]
PrivateKey = $(cat owner.key)
Address = 10.8.0.2/24
DNS = 1.1.1.1

[Peer]
PublicKey = $(cat server.pub)
Endpoint = ${VPS_IP}:51820
AllowedIPs = 10.8.0.0/24
PersistentKeepalive = 25
CONF
echo "===== OWNER CLIENT CONFIG (import into WireGuard app) ====="
cat /root/owner-wg.conf
echo "===== QR for phone ====="
qrencode -t ansiutf8 < /root/owner-wg.conf
echo "02_wireguard OK"
