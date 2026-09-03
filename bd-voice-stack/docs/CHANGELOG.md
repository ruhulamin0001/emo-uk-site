# CHANGELOG
Record here every place where live vendor docs differed from this repo and what you changed.

## 2026-09-03  Pre-deploy review (before T0), version 1.2

Verified against source on GitHub (docs.asterisk.org, platform.openai.com and ai.google.dev were not
reachable from the review session, so model ids below are still "verify on install day").

### Asterisk 21 (apps/app_audiosocket.c, res/res_audiosocket.c, funcs/func_uuid.c, main/cli.c)
1. AudioSocket() validates its first argument with `uuid_parse()`. `${UNIQUEID}` is not a UUID, so
   every AI call would have failed at the app. Dialplan now uses `${UUID()}` (func_uuid exists in 21).
2. AudioSocket() sets no `AUDIOSOCKET_STATUS`. It returns -1 on failure, which hangs the channel up.
   Dialplan now wraps it in `TryExec()` and branches on `TRYSTATUS`, so a dead bridge rings the humans.
3. When the bridge sends the 0x00 hangup frame AudioSocket() returns 0 and the dialplan continues.
   Transfer is now: bridge sets `TRANSFER_TARGET` over AMI, sends hangup, dialplan does the Goto.
   AMI Redirect stays as a fallback only.
4. `core show channels concise` has uniqueid in field 13 (0-based), not 12. The bridge no longer
   depends on it: the dialplan writes `AstDB aibridge/<uuid> = channel` and the bridge reads it.
5. AMI `Command` responses arrive as `Output:` header lines (Asterisk 14+). Parser strips the prefix.

### FreePBX 17 (FreePBX/bulkhandler, FreePBX/core, FreePBX/ringgroups on release/17.0)
6. `fwconsole bulkimport` accepts only `--type=extensions|dids` (plus callaccounting). There is no
   trunks import. `scripts/04_trunks.sh` now calls `scripts/freepbx_provision.php`, which uses
   `FreePBX::Core()->addTrunk()`, `FreePBX::Ringgroups()->add()`, `core_did_add()` and
   `core_routing_addbyid()`. Raw MariaDB inserts removed.
7. Extension to business pinning no longer needs the Extension Routing module: each outbound
   route's dial patterns carry the CallerID field (`match_cid`) = that business's extensions.
8. The Sangoma installer now defaults to Asterisk 22 (`ASTVERSION=${ASTVERSION:-22}`). We export
   `ASTVERSION=21` in `scripts/03_freepbx.sh` because this stack was verified on 21.

### Runtime and scripts
9. systemd `EnvironmentFile` keeps trailing `# comments` inside values. `deploy/env.example` had
   them on `AGENT_MODE` and `NOTIFY`, which would have produced "unknown AGENT_MODE". Removed.
10. ufw "default deny incoming" also blocked the WireGuard interface, so http://10.8.0.1 would have
    been unreachable. `02_wireguard.sh` adds `ufw allow in on wg0`.
11. `rsync` was used by `install_bridge.sh` but never installed. Added to `01_base.sh`.
12. `.env` rendering moved from sed to python so keys containing `&`, `|` or `/` are safe.
13. Playback pacing is now clock based (never more than PLAYBACK_LEAD_FRAMES x 20 ms ahead of real
    time) instead of "sleep 18 ms per frame", which drifted ahead and slowed barge in.
14. Domain fixed to `aiagent.jagatitlimited.com` in `deploy/answers.env.example`.

### Still to verify on install day (vendor pages were unreachable during review)
- OpenAI: `gpt-realtime-2.1-mini`, `gpt-4o-mini-transcribe`, `gpt-5-mini` ids and the GA
  `session.update` shape (`session.type = realtime`, `audio.input.format`, `audio.output.voice`).
- Gemini: `gemini-2.5-flash-native-audio-preview-12-2025` id and `google-genai` Live API names.
- FreePBX: exact pjsip trunk setting keys accepted by `Core()->addTrunk()`. The script passes the
  GUI form field names; check `fwconsole trunks`/GUI after T3 and note any key that was ignored.
