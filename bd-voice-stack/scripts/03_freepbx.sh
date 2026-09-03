#!/usr/bin/env bash
# T2: FreePBX 17 on Debian 12 (official Sangoma installer) + admin UI limited to VPN
# The installer defaults to Asterisk 22 (ASTVERSION=${ASTVERSION:-22} in the script). This stack
# is specified and verified on Asterisk 21 (AudioSocket hangup handling, UUID() function), so we
# pin 21 explicitly. Override with ASTVERSION=22 if the owner wants the newer branch.
set -euo pipefail
source /opt/bd-voice-stack/deploy/answers.env
export ASTVERSION="${ASTVERSION:-21}"
wget -q https://github.com/FreePBX/sng_freepbx_debian_install/raw/master/sng_freepbx_debian_install.sh -O /tmp/sng_freepbx_debian_install.sh
bash /tmp/sng_freepbx_debian_install.sh
fwconsole ma installall || true
fwconsole reload
# admin UI only from VPN
cat > /etc/apache2/conf-available/vpn-only.conf <<CONF
<Location />
    Require ip 127.0.0.1 ${VPN_SUBNET}
</Location>
CONF
a2enconf vpn-only && systemctl reload apache2
asterisk -rx "core show version"
asterisk -rx "core show application AudioSocket" | head -3
asterisk -rx "core show function UUID" | head -3
echo "03_freepbx OK. Owner: open http://10.8.0.1 over VPN and create the admin user."
