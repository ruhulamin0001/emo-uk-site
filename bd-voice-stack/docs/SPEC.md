# SPEC.md  Technical specification (agent readable)

Version 1.3, 03 Sep 2026. Audience: Claude Code (executor) and the owner (reviewer).
Language: English for the machine, Bangla only inside prompts and owner facing messages.

## 1. Goal and success criteria
Run a phone system for 5 small businesses whose IPTSP numbers (096 prefix, e.g. Ranks ITT 09666, Amber IT 09611) are answered by an AI receptionist in Bangla, with human transfer, order lookup, callback capture, call logging and owner notifications over WhatsApp. Success = the five checks in CLAUDE.md "Definition of done".

## 2. Hard constraints
1. Hosting is the owner's existing Hostinger VPS (72.62.213.196), Docker, next to the other sites. No new VPS, no VPN, no FreePBX GUI, no second reverse proxy. `scripts/preflight.sh` warns (does not stop) when the public IP is not in Bangladesh; the BD office confirms with the operator that registration from this IP is allowed. If an operator refuses, that operator's numbers cannot be used from this box, full stop.
2. Every number has KYC done by the BD office with the operator. The repo never handles KYC documents.
3. Calls are recorded (MixMonitor). The AI announces recording in its first sentence (in prompts).
4. Outbound international dialling is impossible: the dialplan only has Bangladesh patterns (01, 02, 03 to 09, 880), nothing starting 00 or +.
5. Secrets only in `/root/bd-voice-stack/.env`, `deploy/trunks.csv` and `deploy/extension_secrets.txt` on the VPS. All three are git ignored.

## 3. Architecture
```
PSTN caller -> IPTSP operator SIP -> [Hostinger VPS] docker: asterisk (Asterisk 21, pjsip)
   trunk endpoint carries BIZ and DID (set_var) -> [from-trunk] -> [ai-agent] ->
   TryExec(AudioSocket(${UUID()}, ai-bridge:9092)) -> docker: ai-bridge (python asyncio)
   -> provider (Gemini Live | OpenAI Realtime | pipeline)
   ai-bridge -> AMI asterisk:5038 (AstDB aibridge/<uuid> -> channel, Getvar, Setvar TRANSFER_TARGET)
   ai-bridge -> docker: db (Postgres: calls, callbacks, orders) -> WhatsApp Cloud API summary
Owner / BD office softphones -> sip:aiagent.jagatitlimited.com (udp/5060, A record -> VPS)
```
Published host ports: udp/5060 and udp/RTP_START..RTP_FINISH (default 10000 to 10200, 1:1 mapping). AMI and AudioSocket stay on the compose network. Traefik is untouched.

Audio path: Asterisk sends 16 bit signed linear mono at 8 kHz in 20 ms frames (320 bytes). Bridge resamples to the provider rate (24 kHz OpenAI, 16 kHz Gemini/pipeline) with `scipy.signal.resample_poly`, and back to 8 kHz for playback, paced on a monotonic clock never more than `PLAYBACK_LEAD_FRAMES` ahead of real time (fast barge in).

Barge in: provider signals speech start (OpenAI `input_audio_buffer.speech_started`, Gemini `server_content.interrupted`, pipeline local RMS VAD); bridge drains the playback queue immediately.

Transfer: tool `transfer_to_human` -> AMI `Setvar TRANSFER_TARGET=60N` on the caller channel, then the bridge sends the AudioSocket hangup frame. AudioSocket() returns 0, the dialplan sees TRANSFER_TARGET and does `Goto(from-internal,60N,1)` (ring group = Dial of that business's extensions). If the bridge is down, `TryExec` sets `TRYSTATUS=FAILED` and the dialplan goes to `ai-fallback` (same ring group), so the business never loses a call.

Inbound matching: each trunk registers with `line=yes`, so the operator's INVITE is matched to the exact trunk endpoint even when all 10 trunks share one operator host. The endpoint's `set_var=BIZ` and `set_var=DID` tell the dialplan which business it is. No DID pattern guessing.

Outbound: `[from-internal]` Bangladesh patterns -> `[outbound]` subroutine. The caller's endpoint carries `set_var=BIZ`, the subroutine sets CALLERID to that business's first number and dials that business's trunks in order (failover on CHANUNAVAIL or CONGESTION). An extension with no business is refused (Hangup 21).

## 4. Components and versions
| Component | Version / model | Why |
|---|---|---|
| Host | Hostinger KVM 2, Debian/Ubuntu with Docker, Traefik on 80/443 | already there, owner's choice |
| Asterisk | 21 (asterisk-21-current tarball, own image `asterisk/Dockerfile`) | AudioSocket with hangup support, UUID() function, pjsip; verified against source |
| ai-bridge | python:3.11-slim image, `Dockerfile` | asyncio, scipy, psycopg |
| Gemini Live | `gemini-2.5-flash-native-audio-preview-12-2025` or newer Flash Live | default: owner already has a Gemini key, cheapest speech to speech, Bangla |
| OpenAI Realtime | `gpt-realtime-2.1-mini` (when a key exists) | A/B candidate |
| Pipeline | STT `gpt-4o-mini-transcribe` (bn), LLM `gpt-5-mini`, TTS ElevenLabs `eleven_flash_v2_5` (bn) | best Bangla voice, premium customers |
| Summary | `gemini-2.5-flash` JSON (or `gpt-5-mini` when only OpenAI is set) | cheap post call summary |
| DB | postgres:16-alpine container | no external service, data stays on the VPS |
| Notify | WhatsApp Cloud API v21 template `call_summary` (bn); Telegram optional | owner's channel |

Model names drift. On the install day, verify each model id against the vendor's model list and record any change in `docs/CHANGELOG.md`. Do not silently pick a different model.

## 5. Provider facts (Bangla voice)
| Provider | Bangla | Price (list, Sep 2026) |
|---|---|---|
| Gemini Live native audio | understands and speaks | $3 in / $12 out per 1M audio tokens, about $0.01 to $0.025 per min, free tier |
| OpenAI Realtime mini | understands and speaks, accent slightly foreign | $10 in / $20 out per 1M audio tokens, about $0.02 to $0.04 per min |
| ElevenLabs TTS Flash v2.5 | Bengali, most natural | about $0.10 to $0.30 per 1k chars |
| OpenAI transcribe mini | Bengali | $0.003/min |

Decision procedure (T9): 10 calls per provider with the same prompt, BD office scores naturalness and understanding 1 to 5, bridge logs latency. Highest score with latency under 1200 ms wins as default.

## 6. Repository map
```
CLAUDE.md                 agent operating rules (read first)
docs/SPEC.md              this file
docs/TASKS.md             ordered tasks with acceptance checks
docs/CHANGELOG.md         vendor drift and review notes
docs/AB_RESULTS.md        provider A/B table
docker-compose.yml        asterisk + ai-bridge + db (no Traefik labels, no HTTP)
Dockerfile                ai-bridge image
asterisk/Dockerfile       Asterisk 21 from source
asterisk/etc/             generated config (git ignored)
deploy/env.example        copy to /root/bd-voice-stack/.env on the VPS
deploy/trunks.csv         numbers with SIP credentials (BD office fills, on the VPS only)
deploy/extensions.csv     human extensions per business
scripts/render_conf.py    CSV + .env -> asterisk/etc/*.conf (pjsip, extensions, manager, rtp, ...)
scripts/vps-deploy.sh     git pull, render, compose up --build, schema, health
scripts/preflight.sh      T0 checks on the VPS
scripts/healthcheck.sh    one line per check, exit code
scripts/fail2ban-host.sh  optional host fail2ban jail on the container security log
bridge/                   python package (main, audiosocket, resample, ami, tools, store, notify, config, providers/)
prompts/                  QUESTIONS.md and biz1..biz5.md system prompts (Bangla)
sql/schema.sql            Postgres tables + seed orders (applied on every deploy, idempotent)
tests/                    unit tests, render tests, smoke test
```

## 7. Important implementation notes for the executor
1. Asterisk facts verified in the 21 source: AudioSocket() validates its argument with uuid_parse() (so `${UUID()}`), sets no status variable (so `TryExec`), returns 0 on the 0x00 hangup frame. AMI `Command` output arrives as `Output:` header lines. `core show channels concise` has uniqueid in field 13, only used as a fallback.
2. Channel lookup: dialplan writes `DB(aibridge/<uuid>)=${CHANNEL}` before AudioSocket and deletes it after (plus a hangup handler). Bridge reads it with AMI `database get aibridge <uuid>`. Check once with a live call that `docker compose logs ai-bridge` shows `channel=PJSIP/...` and not `channel=None`.
3. NAT: the container is behind docker bridge NAT. `pjsip.conf` transport has `external_media_address` and `external_signaling_address` = PUBLIC_IP and `local_net` for the docker ranges; trunk endpoints have `rtp_symmetric`, `force_rport`, `rewrite_contact`. RTP ports are published 1:1 so the advertised port is the real port. If audio is one way, check `RTP_START/RTP_FINISH` match between `.env` and `rtp.conf` (render does this) and that no host firewall drops that udp range.
4. Operator registration from a foreign IP: some IPTSP operators whitelist BD IP space only. Ask the BD office to get written confirmation before buying 10 numbers. Test with 1 number first.
5. Playback pacing: `PLAYBACK_LEAD_FRAMES` default 3 (60 ms). Choppy audio: raise to 5. Slow barge in: lower to 2.
6. Gemini SDK is `google-genai`. Both it and `openai` are in the image, only the configured provider is used.
7. Cost guard: monthly hard limit in the Google and OpenAI consoles (owner). `MAX_CALL_SECONDS=600` caps runaway calls.
8. Recordings: `./data/recordings` on the VPS. Add a cron on the host to delete `*.wav` older than 90 days (`find /root/bd-voice-stack/data/recordings -name '*.wav' -mtime +90 -delete`).
9. Secrets: if a key ever appears in a log or chat, tell the owner to rotate it. The owner's Gmail currently holds several keys in plain text; rotate them before go live.
10. Softphone security: 24 char random passwords per extension (`deploy/extension_secrets.txt`), `max_contacts=3`, optional `EXTENSION_ALLOW_CIDR`, host fail2ban jail (`scripts/fail2ban-host.sh`, bans in DOCKER-USER chain).

## 8. Phase 3 (later): multi tenant for reseller customers
Same box, same pattern: each customer = another `bizN` row set in the CSVs. Beyond ~20 tenants move to FusionPBX on a BD VPS. Billing from Asterisk CDR (cdr.conf enabled) into Postgres nightly.

## 9. Phase 4 (later): reseller portal
Next.js on this VPS behind Traefik (like the jagat sites) + Postgres here + bKash Merchant + SSLCommerz. Tables: customers, numbers, kyc_docs, wallet_tx, subscriptions, calls.

## 10. Monthly cost model (for the owner)
VPS: already paid. Numbers 0 monthly (one time 5,000 to 8,500 BDT for 10); operator minutes about 0.40 BDT/min + VAT; AI at 5,000 min/month: Gemini about $75, OpenAI mini about $150; WhatsApp utility template about 0.7 BDT per message.
