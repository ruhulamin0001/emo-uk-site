# TASKS.md  (execute in order; each task has Inputs, Steps, Acceptance)

Legend: [OWNER] = ask the owner. [BD] = BD office must do it, you wait. [YOU] = you do it over SSH.

---
## T0  Preflight (10 min)
Inputs [OWNER]: VPS_IP, SSH key path, DOMAIN (e.g. pbx.example.com), TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID (one per business ok later), OPENAI_API_KEY.
Steps [YOU]:
1. `ssh` in, confirm `cat /etc/os-release` shows Debian 12 and `curl -s ifconfig.me` shows a Bangladesh IP (check with `curl -s ipinfo.io/<ip>/country` = BD). If not BD, STOP: IPTSP operators reject foreign IPs.
2. Clone this repo to `/opt/bd-voice-stack`.
3. Copy `deploy/answers.env.example` to `deploy/answers.env` and fill from the owner's answers.
Acceptance: `bash scripts/preflight.sh` exits 0.

## T1  Base OS, firewall, WireGuard (20 min)
Steps [YOU]: `sudo bash scripts/01_base.sh` then `sudo bash scripts/02_wireguard.sh`.
Give the owner the client config printed at the end (Bangla one liner: "এটা WireGuard অ্যাপে import করুন").
Acceptance: `sudo wg show` lists wg0; owner confirms `ping 10.8.0.1` works from laptop; `sudo ufw status` shows 22, 51820/udp, 5060/udp, 10000:20000/udp.

## T2  FreePBX 17 install (40 min, mostly waiting)
Steps [YOU]: `sudo bash scripts/03_freepbx.sh`. Then tell the owner to open `http://10.8.0.1` over VPN and create the admin user (you never know that password).
Acceptance: `asterisk -rx "core show version"` shows Asterisk 21.x; `asterisk -rx "core show function UUID"` and `core show application AudioSocket` both exist; `fwconsole ma list | grep -c Enabled` > 40; HTTP on public IP returns 403 (only VPN allowed).

## T3  Trunks for the 10 numbers (30 min)
Inputs [BD]: `deploy/trunks.csv` filled (columns: biz,name,number,host,port,username,secret,channels,codecs,register). Wait until the BD office sends it.
Steps [YOU]: `sudo bash scripts/04_trunks.sh deploy/trunks.csv` (creates pjsip trunks through the FreePBX PHP API in `scripts/freepbx_provision.php`, then reload). Check one trunk in the GUI over VPN (Connectivity > Trunks) and confirm host, username, registration are what the CSV says.
Acceptance: `asterisk -rx "pjsip show registrations"` shows every trunk Registered. If any is Unregistered, run `asterisk -rx "pjsip set logger on"` for 60 s, capture the 401/403/408 and ask the BD office to verify that credential.

## T4  Extensions, ring groups, routes, AI dialplan (30 min)
Steps [YOU]: `sudo bash scripts/05_routing.sh` (creates extensions from `deploy/extensions.csv` via Bulk Handler, ring groups 601..605, inbound route per DID to `ai-agent,bizN,1`, one outbound route per business whose patterns are pinned to that business's extensions by CallerID, ISD impossible, installs `deploy/asterisk/extensions_custom.conf` and `manager_custom.conf`). Extension passwords land in `/root/extension_secrets.txt`.
Acceptance [BD]: BD office calls biz1 number from a mobile; Asterisk CLI (`asterisk -rvvv`) prints `AI agent for biz1` (with the bridge not yet running the call must fall through to ring group 601, that proves TryExec fallback). Extension 101 (softphone over VPN) calls a mobile; caller ID shows biz1's 096 number. Extension 201 calling out must use biz2's trunk (watch `pjsip set logger on`).

## T5  ai-bridge install and first live call (30 min)
Inputs [OWNER]: OPENAI_API_KEY (already), business facts for `prompts/biz1.md` (ask 6 questions listed in `prompts/QUESTIONS.md`).
Steps [YOU]: `sudo bash scripts/install_bridge.sh`, fill `/opt/ai-bridge/.env`, `systemctl start ai-bridge`, `journalctl -u ai-bridge -f`.
Acceptance [BD]: call biz1; Bangla greeting within 1.5 s; caller interrupts and AI stops within ~300 ms; `journalctl` shows both user and assistant transcript lines; `bash tests/smoke_audiosocket.sh` exits 0.

## T6  Tools: transfer, callback, order lookup (30 min)
Steps [YOU]: apply `sql/schema.sql` to Supabase (owner runs it in the SQL editor or you use the service key with psql), insert 3 fake orders, enable tools in `.env` (`TOOLS_ENABLED=transfer_to_human,request_callback,lookup_order`).
Acceptance [BD]: "আমার অর্ডার 1001 কোথায়" gets the seeded status; "মানুষের সাথে কথা বলব" rings group 601 and the AI socket closes (journal shows `transfer ok`, Asterisk CLI shows `transfer to human 601`); callback request creates a row in `callbacks`.

## T7  Call log and Telegram summary (20 min)
Steps [YOU]: set TELEGRAM_* in `.env`, restart, make a call, hang up.
Acceptance: row in `calls` with summary and intent within 15 s; Telegram message received by the owner.

## T8  Remaining 4 businesses (20 min)
Steps [YOU]: fill `prompts/biz2.md` .. `biz5.md` from the owner's answers; set OWNER_CHAT_IDS per business.
Acceptance: all 10 numbers answer with the right business name.

## T9  Hardening and load (30 min)
Steps [YOU]: `sudo bash scripts/06_harden.sh` (restrict 5060/RTP to operator IPs from trunks.csv + VPN, Apache allow only VPN, fail2ban asterisk jail, recordings retention cron, ISD block check), then `bash tests/load_sipp.sh 5 600`.
Acceptance: `scripts/healthcheck.sh` exit 0; sipp 5 concurrent calls for 10 min with 0 failed; `fail2ban-client status asterisk` shows the jail.

## T10  Gemini Live A/B (optional, 30 min)
Steps [YOU]: set `AGENT_MODE=realtime_gemini`, GEMINI_API_KEY; 10 test calls each provider; save recordings under `/var/spool/asterisk/monitor/ab/`.
Acceptance: `docs/AB_RESULTS.md` filled with latency (speech end to first audio) and the BD office's 1 to 5 naturalness score.

## T11  WhatsApp Cloud API (after Meta business verification)
Steps [YOU]: create template `call_summary` (bn), set WHATSAPP_* in `.env`, set `NOTIFY=whatsapp,telegram`.
Acceptance: WhatsApp summary received.

## T12  FusionPBX multi tenant and reseller portal
Not in this repo yet. Only when the first paying reseller customer exists. See `docs/SPEC.md` section 8 and 9.
