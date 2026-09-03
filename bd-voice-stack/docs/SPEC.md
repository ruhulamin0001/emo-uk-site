# SPEC.md  Technical specification (agent readable)

Version 1.2, 03 Sep 2026 (1.1 reviewed against Asterisk 21 and FreePBX 17 source, see docs/CHANGELOG.md). Audience: Claude Code (executor) and the owner (reviewer).
Language: English for the machine, Bangla only inside prompts and owner facing messages.

## 1. Goal and success criteria
Build and operate a phone system in Bangladesh where 10 IPTSP numbers (096 prefix, e.g. Ranks ITT 09666, Amber IT 09611) belonging to 5 small businesses are answered by an AI receptionist in Bangla, with human transfer, order lookup, callback capture, call logging and owner notifications. Success = the five checks in CLAUDE.md "Definition of done".

## 2. Hard constraints (regulatory and network)
1. BTRC rule: IPTSP SIP traffic must originate from Bangladesh IP space. Operators block foreign IPs. Therefore the PBX and the AI bridge run on a VPS physically in Bangladesh. `scripts/preflight.sh` enforces country = BD.
2. Every number has KYC (NID + trade licence) done by the BD office with the operator or reseller. The repo never handles KYC documents.
3. Calls are recorded. The AI must announce recording in its first sentence (already in prompts).
4. Outbound international dialling is blocked at the outbound route level to prevent toll fraud.

## 3. Architecture
```
PSTN caller -> IPTSP operator SIP -> [BD VPS] Asterisk 21 (FreePBX 17)
   inbound route per DID -> ai-agent,bizN,1 -> TryExec(AudioSocket(${UUID()},127.0.0.1:9092))
   -> ai-bridge (python asyncio) -> provider (OpenAI Realtime | Gemini Live | pipeline)
   ai-bridge -> AMI (127.0.0.1:5038): AstDB aibridge/<uuid> -> channel, Getvar, Setvar TRANSFER_TARGET
   ai-bridge -> Supabase REST (calls, callbacks, orders) -> Telegram / WhatsApp summary
UK owner/team -> WireGuard (10.8.0.0/24) -> softphone extensions and FreePBX admin (VPN only)
BD office -> public IP SIP (restricted to office/operator IPs after T9)
```
Audio path: Asterisk sends 16 bit signed linear mono at 8 kHz in 20 ms frames (320 bytes). Bridge resamples to the provider rate (24 kHz OpenAI, 16 kHz Gemini/pipeline) with `scipy.signal.resample_poly`, and back to 8 kHz for playback, paced at real time so Asterisk never buffers more than a few frames (needed for fast barge in).

Barge in: provider signals speech start (OpenAI `input_audio_buffer.speech_started`, Gemini `server_content.interrupted`, pipeline local RMS VAD); bridge drains the playback queue immediately.

Transfer: tool `transfer_to_human` -> AMI `Setvar TRANSFER_TARGET=60N` on the caller channel, then the bridge sends the AudioSocket hangup frame. AudioSocket() returns 0, the dialplan sees TRANSFER_TARGET and does `Goto(from-internal,60N,1)`. If the bridge is down or crashes, `TryExec` sets `TRYSTATUS=FAILED` and the dialplan goes to `ai-fallback` (human ring group), so the business never loses a call. (AudioSocket sets no AUDIOSOCKET_STATUS variable and needs a real UUID, see CHANGELOG.)

## 4. Components and versions
| Component | Version / model | Why |
|---|---|---|
| OS | Debian 12 | FreePBX 17 official installer target |
| Asterisk / FreePBX | 21 LTS / 17 (installer pinned with ASTVERSION=21, default is now 22) | AudioSocket app with hangup support, UUID() function, pjsip, long support |
| Python | 3.11+ (Debian 12 has 3.11) | asyncio, scipy |
| OpenAI Realtime | `gpt-realtime-2.1-mini` (default), `gpt-realtime-2.1` (quality) | speech to speech, Bangla in and out, tools |
| Gemini Live | `gemini-2.5-flash-native-audio-preview-12-2025` or newer Flash Live | cheapest speech to speech, 70 languages |
| Pipeline | STT `gpt-4o-mini-transcribe` (bn), LLM `gpt-5-mini`, TTS ElevenLabs `eleven_flash_v2_5` (bn) | best Bangla voice |
| Summary | `gpt-5-mini` JSON mode | cheap post call summary |
| DB | Supabase Postgres via PostgREST | no server side DB to run |
| Notify | Telegram Bot API first, WhatsApp Cloud API v21 after Meta verification | Telegram works in 5 minutes |
| VPN | WireGuard | UK team gets a BD private path |

Model names drift. On the install day, verify each model id against the vendor's model list and record any change in `docs/CHANGELOG.md`. Do not silently pick a different model.

## 5. Provider facts and links (Bangla voice)
| Provider | Bangla | Price (list, Sep 2026) | Link |
|---|---|---|---|
| OpenAI Realtime mini | understands and speaks, accent slightly foreign | $10 in / $20 out per 1M audio tokens, about $0.02 to $0.04 per min | https://developers.openai.com/api/docs/pricing , https://platform.openai.com/docs/guides/realtime |
| OpenAI Realtime full | better prosody | $32 in / $64 out per 1M audio tokens | same |
| Gemini Live native audio | understands and speaks | $3 in / $12 out per 1M audio tokens, about $0.01 to $0.025 per min, free tier | https://ai.google.dev/gemini-api/docs/live , https://ai.google.dev/gemini-api/docs/pricing |
| ElevenLabs TTS (Multilingual v2, v3, Flash v2.5) | Bengali supported, most natural | Creator $22/mo 100k credits; API about $0.10 to $0.30 per 1k chars | https://elevenlabs.io/text-to-speech/bengali , https://elevenlabs.io/docs/overview/models , https://elevenlabs.io/pricing/api |
| Google Cloud TTS bn-IN (Standard, WaveNet, Chirp 3 HD) | Kolkata accent, no bn-BD | $4 / $16 / about $30 per 1M chars | https://cloud.google.com/text-to-speech/docs/voices , https://cloud.google.com/text-to-speech/pricing |
| OpenAI transcribe | Bengali | gpt-4o-transcribe $0.006/min, mini $0.003/min | https://platform.openai.com/docs/guides/speech-to-text |
| Deepgram Nova 3 | Bengali (multilingual) | about $0.0077/min | https://deepgram.com/pricing |
| Open source reference | AVA AI Voice Agent for Asterisk (MIT), AudioSocket based, supports OpenAI/Gemini/Deepgram/ElevenLabs | free | https://github.com/hkjarral/AVA-AI-Voice-Agent-for-Asterisk |

Decision procedure (T10): 10 calls per provider with the same prompt, BD office scores naturalness and understanding 1 to 5, bridge logs latency (speech end to first output audio). Highest score with latency under 1200 ms wins as default. ElevenLabs pipeline is reserved for premium customers because of cost.

## 6. Repository map
```
CLAUDE.md                 agent operating rules (read first)
docs/SPEC.md              this file
docs/TASKS.md             ordered tasks with acceptance checks
docs/CHANGELOG.md         vendor drift notes
docs/AB_RESULTS.md        provider A/B table
deploy/answers.env.example  owner supplied values (copy to answers.env)
deploy/trunks.csv         10 numbers with SIP credentials (BD office fills)
deploy/extensions.csv     human extensions per business
deploy/env.example        runtime env for /opt/ai-bridge/.env
deploy/asterisk/extensions_custom.conf  ai-agent dialplan + fallback
deploy/asterisk/manager_custom.conf     AMI user (secret injected)
deploy/ai-bridge.service  systemd unit
scripts/preflight.sh      T0 checks
scripts/01_base.sh        packages, ssh, ufw
scripts/02_wireguard.sh   VPN server + owner client config
scripts/add_vpn_peer.sh   more VPN users
scripts/03_freepbx.sh     FreePBX 17 install, admin UI VPN only
scripts/04_trunks.sh      trunks from CSV (via freepbx_provision.php)
scripts/05_routing.sh     extensions, ring groups, routes, dialplan, AMI
scripts/freepbx_provision.php  FreePBX PHP API calls used by 04 and 05
scripts/install_bridge.sh venv, .env, systemd
scripts/06_harden.sh      firewall lock down, fail2ban, retention, ISD check
scripts/healthcheck.sh    one line per check, exit code
bridge/                   python package (main, audiosocket, resample, ami, tools, store, notify, config, providers/)
prompts/                  QUESTIONS.md and biz1..biz5.md system prompts (Bangla)
sql/schema.sql            Supabase tables + seed orders
tests/                    unit tests, smoke test, sipp load
```

## 7. Important implementation notes for the executor
1. `scripts/04_trunks.sh` and `scripts/05_routing.sh` create FreePBX objects through `scripts/freepbx_provision.php`, which bootstraps FreePBX (`/etc/freepbx.conf`) and calls the same PHP API the GUI uses (`Core()->addTrunk`, `Ringgroups()->add`, `core_did_add`, `core_routing_addbyid`). Extensions still go through `fwconsole bulkimport --type=extensions` (the only bulk types are extensions and dids; there is no trunks type). If a function is missing the script stops and prints the GUI steps; do them over VPN and note it in CHANGELOG.md. Never leave a half applied route: `fwconsole reload` must succeed with no errors. Inbound routes point straight at `ai-agent,bizN,1`; a Custom Destination row in the GUI is optional cosmetics.
2. Extension to business pinning for outbound caller ID: each business's outbound route has its dial patterns duplicated per extension with the CallerID field (`match_cid`) = that extension, so 101 can only dial out through biz1's trunks. Extensions also get `outboundcid` = the business's first number. Verify with one real outbound call per business. No Extension Routing module needed.
3. DID format: operators send the called number in different shapes (`09666...`, `+88096...`, `88096...`). Capture the real INVITE with `pjsip set logger on`, then make the inbound route DID match exactly, or add a second route with the alternate format.
4. AudioSocket requires the channel audio format to be slin (8 kHz). The dialplan sets `CHANNEL(audioreadformat)` and `audiowriteformat`. If audio is garbled, check `core show channel <ch>` native formats and codec negotiation with the trunk.
5. Keep `MixMonitor` before `AudioSocket` so every AI call is recorded even when the bridge dies.
6. Channel lookup: the dialplan writes `DB(aibridge/<uuid>)=${CHANNEL}` before AudioSocket and deletes it after (plus a hangup handler). The bridge reads it with AMI `Command: database get aibridge <uuid>`. Fallback: field 13 of `core show channels concise` (uniqueid, Asterisk 21). Check once with a live call that `journalctl -u ai-bridge` shows `channel=PJSIP/...` and not `channel=None`.
7. Playback pacing: `player()` releases frames on a monotonic clock and may run at most `PLAYBACK_LEAD_FRAMES` (default 3 = 60 ms) ahead of real time. Choppy audio on a slow VPS: raise to 5. Slow barge in: lower to 2.
8. OpenAI Realtime event names: the code handles both GA (`response.output_audio.delta`) and beta (`response.audio.delta`). If a new name appears in the docs, add it, do not remove the old ones.
9. Gemini SDK is `google-genai` (not `google-generativeai`). Install with `pip install 'ai-bridge[gemini]'`.
10. Cost guard: set a monthly hard limit in the OpenAI and Google consoles (owner does this, ask them). `MAX_CALL_SECONDS=600` caps runaway calls.
11. Recordings live in `/var/spool/asterisk/monitor/`; the cron in 06_harden deletes after 90 days.
12. Secrets: `.env` is chmod 600 owned by asterisk. `deploy/answers.env` is git ignored. If a key ever appears in a log or chat, tell the owner to rotate it.

## 8. Phase 3 (later): multi tenant for reseller customers
FusionPBX on a second BD VPS (installer: https://github.com/fusionpbx/fusionpbx-install.sh). Each customer = a domain. AI calls are sent from FusionPBX to this Asterisk box over an internal SIP trunk into context `ai-agent` with a custom SIP header `X-Biz: <tenant>`; extend the dialplan to read `${PJSIP_HEADER(read,X-Biz)}` into `BIZ`. Billing from FusionPBX CDR to Supabase nightly; ASTPP if it grows.

## 9. Phase 4 (later): reseller portal
Next.js 15 + Supabase (auth, RLS, private `kyc` bucket) + bKash Merchant + SSLCommerz. Tables: customers, numbers, kyc_docs, wallet_tx, subscriptions, calls. Web can be hosted anywhere (Vercel or the owner's existing Hostinger VPS with Docker/Traefik); only SIP media must be in BD.

## 10. Monthly cost model (for the owner)
BD VPS 3,000 to 6,000 BDT; numbers 0 monthly (one time 5,000 to 8,500 BDT for 10); operator minutes about 0.40 BDT/min + VAT; AI at 5,000 min/month: OpenAI mini about $150, Gemini about $75, summaries + Supabase $10 to $30; Telegram free, WhatsApp utility template about 0.7 BDT per message.
