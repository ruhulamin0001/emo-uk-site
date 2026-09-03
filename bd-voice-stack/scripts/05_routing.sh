#!/usr/bin/env bash
# T4: extensions, ring groups, inbound/outbound routes, AI dialplan, AMI user
set -euo pipefail
R=/opt/bd-voice-stack
source $R/deploy/answers.env
if [ "$AMI_SECRET" = "GENERATE" ]; then
  AMI_SECRET=$(openssl rand -hex 16)
  sed -i "s/^AMI_SECRET=.*/AMI_SECRET=$AMI_SECRET/" $R/deploy/answers.env
fi

# 1. extensions via Bulk Handler (supported: fwconsole bulkimport --type=extensions)
#    outboundcid = the business's first number, so the caller ID is right even before routing.
python3 - <<'PY'
import csv, secrets
trunks = list(csv.DictReader(open("/opt/bd-voice-stack/deploy/trunks.csv")))
main_number = {}
for t in trunks:
    main_number.setdefault(t["biz"], t["number"])
rows = list(csv.DictReader(open("/opt/bd-voice-stack/deploy/extensions.csv")))
w = csv.writer(open("/tmp/ext_bulk.csv", "w"))
w.writerow(["extension", "name", "description", "tech", "secret", "outboundcid", "accountcode"])
creds = open("/root/extension_secrets.txt", "w")
for r in rows:
    s = secrets.token_urlsafe(16)
    w.writerow([r["extension"], r["name"], r["name"], "pjsip", s, main_number.get(r["biz"], ""), r["biz"]])
    creds.write(f'{r["extension"]} {s}\n')
print("extensions:", len(rows))
PY
chmod 600 /root/extension_secrets.txt
if ! fwconsole bulkimport --type=extensions /tmp/ext_bulk.csv --replace; then
  echo "Bulk Handler rejected the CSV. Export a template from Admin > Bulk Handler > Export > Extensions over VPN,"
  echo "keep its header row, fill the 7 columns we use, re-run this script. Continuing with the rest."
fi

# 2. ring groups, inbound routes, outbound routes through the FreePBX PHP API
php $R/scripts/freepbx_provision.php routing $R/deploy/trunks.csv $R/deploy/extensions.csv

# 3. dialplan + AMI user
cp $R/deploy/asterisk/extensions_custom.conf /etc/asterisk/extensions_custom.conf
sed "s/__AMI_SECRET__/$AMI_SECRET/" $R/deploy/asterisk/manager_custom.conf > /etc/asterisk/manager_custom.conf
chown asterisk:asterisk /etc/asterisk/extensions_custom.conf /etc/asterisk/manager_custom.conf
fwconsole reload
asterisk -rx "manager show user aibridge" | head -5
asterisk -rx "dialplan show ai-agent" | head -25
asterisk -rx "core show function UUID" | head -2
echo "05_routing OK"
