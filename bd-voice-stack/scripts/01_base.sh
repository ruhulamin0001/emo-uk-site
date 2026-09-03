#!/usr/bin/env bash
# T1 part 1: base packages, timezone, ssh hardening, ufw
set -euo pipefail
source /opt/bd-voice-stack/deploy/answers.env
apt-get update && DEBIAN_FRONTEND=noninteractive apt-get upgrade -y
apt-get install -y curl wget git ufw fail2ban unzip htop jq rsync openssl python3-venv python3-pip sox
hostnamectl set-hostname "${DOMAIN}"
timedatectl set-timezone Asia/Dhaka
id ops >/dev/null 2>&1 || { adduser --disabled-password --gecos "" ops; usermod -aG sudo ops; }
mkdir -p /home/ops/.ssh; [ -f /root/.ssh/authorized_keys ] && cp /root/.ssh/authorized_keys /home/ops/.ssh/; chown -R ops:ops /home/ops/.ssh; chmod 700 /home/ops/.ssh
echo 'ops ALL=(ALL) NOPASSWD:ALL' > /etc/sudoers.d/ops
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config
systemctl restart ssh
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 51820/udp
ufw allow 5060/udp    # temporary, restricted in 06_harden.sh
ufw allow 10000:20000/udp
ufw --force enable
ufw status verbose
echo "01_base OK"
