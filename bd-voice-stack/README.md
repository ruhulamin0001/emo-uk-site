# bd-voice-stack
FreePBX 17 + Asterisk 21 on a Bangladesh VPS, 10 IPTSP (096) numbers for 5 businesses, and `ai-bridge`, an AI receptionist speaking Bangla via Asterisk AudioSocket + OpenAI Realtime / Gemini Live / STT+LLM+TTS pipeline.

Start here: `CLAUDE.md`, then `docs/SPEC.md`, then `docs/TASKS.md`.

Local checks before touching the server: `pip install -e . pytest && pytest -q tests` and `bash -n scripts/*.sh`.
Review notes and vendor drift live in `docs/CHANGELOG.md`.
