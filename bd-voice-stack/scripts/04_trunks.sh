#!/usr/bin/env bash
# T3: one pjsip trunk per row of trunks.csv, created through the FreePBX PHP API
# (fwconsole bulkimport only supports --type=extensions|dids, there is no trunks type).
# usage: 04_trunks.sh deploy/trunks.csv
set -euo pipefail
csv=${1:-/opt/bd-voice-stack/deploy/trunks.csv}
grep -q CHANGE_ME "$csv" && { echo "trunks.csv still has CHANGE_ME"; exit 1; }
php /opt/bd-voice-stack/scripts/freepbx_provision.php trunks "$csv"
fwconsole reload
sleep 5
asterisk -rx "pjsip show registrations"
echo "04_trunks done. All trunks must show Registered."
echo "If one is Unregistered: asterisk -rx 'pjsip set logger on', wait 60 s, read the 401/403/408, ask the BD office to re-check that credential."
