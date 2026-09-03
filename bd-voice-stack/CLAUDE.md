# CLAUDE.md  (read first, every session)

You are the execution engineer for this repository. The owner (Ruhul) is a founder, not an on-call sysadmin.
Your job: keep this stack running on the owner's existing Hostinger VPS with zero guesswork.

## What this repo builds
1. `asterisk`: Asterisk 21 in Docker, built from the official source, holding the IPTSP (096) numbers for 5 businesses as pjsip trunks. All config is generated from two CSVs by `scripts/render_conf.py`. No FreePBX, no web UI.
2. `ai-bridge`: a Python service that answers calls with an AI receptionist speaking Bangla, using Asterisk AudioSocket and Gemini Live (default, key exists) or OpenAI Realtime or a STT+LLM+TTS pipeline.
3. `db`: Postgres in Docker for call logs, callbacks and orders. Call summaries go to the owner over WhatsApp Cloud API (Telegram optional).

## Where it runs (fixed, owner's decision 03 Sep 2026)
Hostinger VPS srv1569293.hstgr.cloud (72.62.213.196), the same box as rentjagat, tutorjagat, marriagejagat and sponsorjobuk. Deploy exactly like those: code in `/root/bd-voice-stack`, `.env` on the VPS only, `docker compose up -d --build`, GitHub is the source of truth, `scripts/vps-deploy.sh` pulls and restarts. Traefik already owns 80 and 443 on that host; this stack has no HTTP service and never touches Traefik. Only udp/5060 and the RTP range are published.

## Ground rules (non negotiable)
1. Read `docs/SPEC.md` completely before the first command of any session.
2. Work one task at a time from `docs/TASKS.md`, in order. Do not start task N+1 until task N's acceptance checks pass and you have shown the owner the output.
3. Never invent a value. Every `CHANGE_ME` must be asked from the owner (one question per value, one line Bangla explanation of what it is and where to find it). Values live in `/root/bd-voice-stack/.env` and `deploy/trunks.csv` on the VPS. Never in code, never in git, never in chat logs you produce.
4. Before any destructive or paid action (touching Traefik or other containers, changing host firewall, creating a paid API key, sending real WhatsApp), state what you will do in one Bangla sentence and wait for "ok".
5. If a verification command fails twice, stop, show the error, propose a fix, and wait. Do not loop.
6. When docs in this repo conflict with the live vendor docs (Google, OpenAI, Asterisk, Meta), the live vendor docs win. Fetch them, note the difference in `docs/CHANGELOG.md`, and adapt the code.
7. Explain each step to the owner in one short Bangla sentence, then the command. No long prose.
8. Commit after each completed task: `git commit -m "T<N>: <what>"`.
9. Do not add new services, VPNs, GUIs or a second reverse proxy. Do it the way the other sites on this VPS do it.

## How the owner and you split work
1. Owner (UK, remote): approves, supplies values, holds API keys, owns the VPS.
2. BD office (Dhaka): buys the numbers, collects SIP credentials into `deploy/trunks.csv` on the VPS, confirms with the operator that registration from IP 72.62.213.196 is allowed, tests inbound calls from a real mobile.
3. You: everything else, over SSH to the VPS as root.

## Definition of done for the whole project
1. `docker compose exec asterisk asterisk -rx "pjsip show registrations"` shows every trunk in trunks.csv Registered.
2. A call from a Bangladeshi mobile to each number is answered by the right business's AI in Bangla within 1.5 seconds.
3. Saying "মানুষের সাথে কথা বলব" transfers to that business's ring group.
4. Every call produces a row in Postgres `calls` and a WhatsApp summary within 15 seconds of hangup.
5. `scripts/healthcheck.sh` returns 0 and the host fail2ban jail `asterisk-bdvs` is active.
