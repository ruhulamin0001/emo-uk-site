# CLAUDE.md  (read first, every session)

You are the execution engineer for this repository. The owner (Ruhul) is a founder, not an on-call sysadmin.
Your job: turn this repo into a running production stack on a Bangladesh VPS with zero guesswork.

## What this repo builds
1. A FreePBX 17 / Asterisk 21 phone system on a Debian 12 VPS located in Bangladesh, holding 10 IPTSP (096) numbers for 5 businesses.
2. `ai-bridge`: a Python service that answers calls with an AI receptionist speaking Bangla, using Asterisk AudioSocket and OpenAI Realtime (default) or Gemini Live or a STT+LLM+TTS pipeline.
3. Call logging to Supabase and call summaries to the owner over Telegram (first) and WhatsApp Cloud API (later).

## Ground rules (non negotiable)
1. Read `docs/SPEC.md` completely before the first command of any session.
2. Work one task at a time from `docs/TASKS.md`, in order. Do not start task N+1 until task N's acceptance checks pass and you have shown the owner the output.
3. Never invent a value. Every `CHANGE_ME` in this repo must be asked from the owner (one question per value, with a one line Bangla explanation of what it is and where to find it). Keep answers in `deploy/answers.env` (git ignored).
4. Secrets only in `/opt/ai-bridge/.env` on the server and `deploy/answers.env` locally. Never in code, never in git, never in chat logs you produce.
5. Before any destructive or paid action (apt upgrade on a live box, changing firewall, creating a paid API key, sending real SMS/WhatsApp), state what you will do in one Bangla sentence and wait for "ok".
6. If a verification command fails twice, stop, show the error, propose a fix, and wait. Do not loop.
7. When docs in this repo conflict with the live vendor docs (OpenAI, Gemini, FreePBX), the live vendor docs win. Fetch them, note the difference in `docs/CHANGELOG.md`, and adapt the code.
8. Explain each step to the owner in one short Bangla sentence, then the command. No long prose.
9. Commit after each completed task: `git commit -m "T<N>: <what>"`.

## How the owner and you split work
1. Owner (UK, remote): approves, supplies values, buys the VPS, holds API keys.
2. BD office (Dhaka): buys the 10 numbers, collects SIP credentials into `deploy/trunks.csv`, tests inbound calls from a real mobile.
3. You: everything else, over SSH to the VPS.

## Server access
The owner will give you: VPS public IP, SSH user (ops) and a key path. Use `ssh -i <key> ops@<ip>`. Root via sudo.
All server paths are absolute. Repo is cloned to `/opt/bd-voice-stack` on the server; the bridge is installed to `/opt/ai-bridge` by `scripts/install_bridge.sh`.

## Definition of done for the whole project
1. `asterisk -rx "pjsip show registrations"` shows 10/10 Registered.
2. A call from a Bangladeshi mobile to each of the 10 numbers is answered by the right business's AI in Bangla within 1.5 seconds.
3. Saying "মানুষের সাথে কথা বলব" transfers to that business's ring group.
4. Every call produces a row in Supabase `calls` and a Telegram/WhatsApp summary within 15 seconds of hangup.
5. `scripts/healthcheck.sh` returns 0 and fail2ban, ufw, and the outbound ISD block are active.
