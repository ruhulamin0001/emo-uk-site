# TASKS.md  (execute in order; each task has Inputs, Steps, Acceptance)

Legend: [OWNER] = ask the owner. [BD] = BD office must do it, you wait. [YOU] = you do it over SSH to the VPS as root.

---
## T0  Preflight on the Hostinger VPS (10 min)
Inputs [OWNER]: confirmation that SSH root@72.62.213.196 works from the owner's laptop (key ~/.ssh/postcodeiq_deploy), GEMINI_API_KEY (already exists, owner pastes it into .env on the VPS), WhatsApp Cloud API token + phone number id + owner WhatsApp number (or leave WhatsApp empty and set NOTIFY= until Meta approves).
Steps [YOU]:
1. `ssh root@72.62.213.196`, `git clone <repo> /root/bd-voice-stack` (read only deploy key like rentjagat if the repo is private).
2. `cp deploy/env.example .env`, fill every CHANGE_ME (ask the owner one at a time). `AMI_SECRET` and `POSTGRES_PASSWORD`: `openssl rand -hex 16`. Keep `DATABASE_URL` password equal to `POSTGRES_PASSWORD`.
3. `bash scripts/preflight.sh`.
Acceptance: preflight exits 0 (a WARN about the IP country is expected, not a failure).

## T1  First build and bridge smoke (30 min, mostly the Asterisk build)
Steps [YOU]: put one placeholder trunk row in `deploy/trunks.csv` if the real one is not here yet (secret must not be CHANGE_ME, use `pending`), then `bash scripts/vps-deploy.sh`.
Acceptance: `docker compose ps` shows bdvs-asterisk, bdvs-ai-bridge, bdvs-db healthy; `bash tests/smoke_audiosocket.sh` prints SMOKE OK; `docker compose exec asterisk asterisk -rx "core show function UUID"` and `core show application AudioSocket` both exist; Traefik and the other sites still answer (`curl -I https://rentjagat.com`).

## T2  DNS and softphone (15 min)
Inputs [OWNER]: A record `aiagent.jagatitlimited.com -> 72.62.213.196`.
Steps [YOU]: read extension 101's password from `deploy/extension_secrets.txt`, give it to the owner for Zoiper/MicroSIP (server aiagent.jagatitlimited.com, udp 5060).
Acceptance: `asterisk -rx "pjsip show contacts"` shows 101 Avail; 101 calls 102 (or 601) and audio works both ways.

## T3  Trunks for the numbers (30 min)
Inputs [BD]: `deploy/trunks.csv` filled on the VPS (columns: biz,name,number,host,port,username,secret,channels,codecs,register), starting with ONE number, plus operator confirmation that registration from 72.62.213.196 is allowed.
Steps [YOU]: `bash scripts/vps-deploy.sh`.
Acceptance: `asterisk -rx "pjsip show registrations"` shows Registered. If not: `pjsip set logger on` for 60 s, read the 401/403/408, ask the BD office to verify that credential or the IP whitelist.

## T4  First live AI call (20 min)
Inputs [OWNER]: business facts for `prompts/biz1.md` (6 questions in `prompts/QUESTIONS.md`).
Acceptance [BD]: call the biz1 number from a mobile; Bangla greeting within 1.5 s; caller interrupts and the AI stops within ~300 ms; `docker compose logs ai-bridge` shows `channel=PJSIP/...` and both user and assistant transcript lines. Stop the bridge (`docker compose stop ai-bridge`), call again: the call must ring extension 101 (TryExec fallback). Start it again.

## T5  Tools: transfer, callback, order lookup (20 min)
Steps [YOU]: seed orders are in the schema; `TOOLS_ENABLED` already set.
Acceptance [BD]: "আমার অর্ডার 1001 কোথায়" gets the seeded status; "মানুষের সাথে কথা বলব" rings 601 and the bridge log shows `transfer ok`; callback request creates a row in `callbacks` (`docker compose exec db psql -U aibridge -c 'select * from callbacks'`).

## T6  WhatsApp summary (20 min, after Meta approves the template)
Steps [YOU]: template `call_summary` (bn) with 4 body parameters, set WHATSAPP_* and OWNER_WHATSAPP in .env, `docker compose up -d`, make a call, hang up.
Acceptance: row in `calls` with summary and intent within 15 s; WhatsApp message received by the owner.

## T7  Remaining businesses and outbound (30 min)
Steps [YOU]: fill `prompts/biz2.md` .. `biz5.md`; BD office adds the remaining rows to trunks.csv; `bash scripts/vps-deploy.sh`.
Acceptance: all numbers answer with the right business name; extension 201 calling a mobile shows biz2's 096 number (watch `pjsip set logger on`, the INVITE must leave through biz2's trunk).

## T8  Hardening (20 min)
Steps [YOU]: `bash scripts/fail2ban-host.sh`; set `EXTENSION_ALLOW_CIDR` if the BD office has a static IP; add the recordings retention cron (SPEC note 8).
Acceptance: `scripts/healthcheck.sh` exit 0; `fail2ban-client status asterisk-bdvs` shows the jail; a wrong password softphone gets banned after 5 tries.

## T9  Provider A/B (optional, 30 min)
Steps [YOU]: switch `AGENT_MODE` to `realtime_openai` (needs OPENAI_API_KEY), 10 test calls each provider.
Acceptance: `docs/AB_RESULTS.md` filled with latency and the BD office's 1 to 5 naturalness score.

## T10  Reseller portal
Not in this repo yet. Only when the first paying reseller customer exists. See `docs/SPEC.md` section 8 and 9.
