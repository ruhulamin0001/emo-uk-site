#!/usr/bin/env bash
# T5: install ai-bridge to /opt/ai-bridge
set -euo pipefail
R=/opt/bd-voice-stack
source $R/deploy/answers.env
command -v rsync >/dev/null || apt-get install -y rsync
mkdir -p /opt/ai-bridge
rsync -a --delete $R/bridge $R/prompts $R/tests /opt/ai-bridge/
cp $R/pyproject.toml /opt/ai-bridge/
cd /opt/ai-bridge
[ -d .venv ] || python3 -m venv .venv
. .venv/bin/activate
pip install -q --upgrade pip
pip install -q -e .
# optional providers: pip install -q -e '.[gemini]'  or  '.[pipeline]'
if [ ! -f .env ]; then
  # Render deploy/env.example with values from answers.env. Python, not sed, so keys with & | / are safe.
  ANSWERS=$R/deploy/answers.env python3 - > .env <<'PY'
import os, re
ans = {}
for line in open(os.environ["ANSWERS"], encoding="utf-8"):
    line = line.strip()
    if line and not line.startswith("#") and "=" in line:
        k, v = line.split("=", 1); ans[k.strip()] = v.strip()
chat = ",".join(f"biz{i}:{ans.get(f'TELEGRAM_CHAT_ID_BIZ{i}', '')}" for i in range(1, 6))
override = {
    "OPENAI_API_KEY": ans.get("OPENAI_API_KEY", ""), "OPENAI_REALTIME_MODEL": ans.get("OPENAI_REALTIME_MODEL", "gpt-realtime-2.1-mini"),
    "GEMINI_API_KEY": ans.get("GEMINI_API_KEY", ""), "AMI_SECRET": ans.get("AMI_SECRET", ""),
    "SUPABASE_URL": ans.get("SUPABASE_URL", ""), "SUPABASE_SERVICE_KEY": ans.get("SUPABASE_SERVICE_KEY", ""),
    "TELEGRAM_BOT_TOKEN": ans.get("TELEGRAM_BOT_TOKEN", ""), "OWNER_CHAT_IDS": chat,
    "WHATSAPP_TOKEN": ans.get("WHATSAPP_TOKEN", ""), "WHATSAPP_PHONE_ID": ans.get("WHATSAPP_PHONE_ID", ""),
}
for line in open("/opt/bd-voice-stack/deploy/env.example", encoding="utf-8"):
    m = re.match(r"^([A-Z_]+)=", line)
    if m and m.group(1) in override:
        print(f"{m.group(1)}={override[m.group(1)]}")
    else:
        print(line.rstrip("\n"))
PY
fi
chmod 600 .env
chown -R asterisk:asterisk /opt/ai-bridge
if grep -q CHANGE_ME .env; then echo "WARNING: /opt/ai-bridge/.env still has CHANGE_ME values"; grep -n CHANGE_ME .env; fi
cp $R/deploy/ai-bridge.service /etc/systemd/system/ai-bridge.service
systemctl daemon-reload
systemctl enable --now ai-bridge
sleep 2
systemctl --no-pager status ai-bridge | head -5
ss -ltnp | grep 9092 && echo "install_bridge OK"
