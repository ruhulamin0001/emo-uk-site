# bd-voice-stack
Asterisk 21 (Docker, built from source) holding IPTSP (096) numbers for 5 businesses, plus `ai-bridge`, an AI receptionist speaking Bangla via Asterisk AudioSocket + Gemini Live / OpenAI Realtime / STT+LLM+TTS pipeline, plus Postgres for call logs, WhatsApp summaries to the owner.

Runs on the owner's Hostinger VPS next to the other sites, same deploy pattern (docker compose, .env on the VPS, GitHub source of truth).

Start here: `CLAUDE.md`, then `docs/SPEC.md`, then `docs/TASKS.md`.

Local checks before touching the server: `pip install -e '.[test]' && pytest -q tests`, `bash -n scripts/*.sh`, `python3 scripts/render_conf.py --root <dir with .env and deploy/> --out /tmp/etc`.
Review notes and vendor drift live in `docs/CHANGELOG.md`.
