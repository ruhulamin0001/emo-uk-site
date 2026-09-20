"""AudioSocket TCP server: one asyncio task per call. Run: python -m bridge.main"""
import asyncio, logging, os, time
from . import config, ami, tools, store, notify
from .audiosocket import read_frame, audio_frame, hangup_frame, handshake, T_AUDIO, T_HANGUP, T_ERROR
from .resample import resample

log = logging.getLogger("bridge")

# Playback pacing: frames are released on a monotonic clock, never more than LEAD_FRAMES ahead
# of real time. Small lead = fast barge in; too small = choppy audio on a slow VPS.
LEAD_FRAMES = int(os.getenv("PLAYBACK_LEAD_FRAMES", "3"))     # 3 x 20 ms = 60 ms


def make_provider():
    m = config.AGENT_MODE
    if m == "realtime_openai":
        from .providers.openai_realtime import OpenAIRealtime; return OpenAIRealtime()
    if m == "realtime_gemini":
        from .providers.gemini_live import GeminiLive; return GeminiLive()
    if m == "pipeline":
        from .providers.pipeline import Pipeline; return Pipeline()
    raise RuntimeError(f"unknown AGENT_MODE {m!r}")


def load_prompt(biz: str) -> str:
    path = os.path.join(config.PROMPT_DIR, f"{biz}.md")
    with open(path, encoding="utf-8") as f:
        return f.read()


async def call_context(uid: str) -> dict:
    """Ask Asterisk who this UUID belongs to. Never raises: a dead AMI must not kill the call."""
    ctx = {"channel": None, "biz": "biz1", "caller": "unknown", "recording": None}
    try:
        ch = await ami.channel_by_uuid(uid)
        if ch:
            v = await ami.get_vars(ch, ["BIZ", "CALLERID(num)", "CALLFILENAME"])
            ctx.update(channel=ch, biz=v["BIZ"] or "biz1", caller=v["CALLERID(num)"] or "unknown",
                       recording=v["CALLFILENAME"])
        else:
            log.warning("no channel found for uuid %s (smoke test?)", uid)
    except Exception as e:
        log.error("AMI lookup failed for %s: %s", uid, e)
    return ctx


async def handle_call(reader: asyncio.StreamReader, writer: asyncio.StreamWriter):
    peer = writer.get_extra_info("peername")
    try:
        uid = await asyncio.wait_for(handshake(reader), timeout=5)
    except Exception as e:
        log.warning("bad handshake from %s: %s", peer, e); writer.close(); return
    info = await call_context(uid)
    biz, caller, recording = info["biz"], info["caller"], info["recording"]
    log.info("call start uid=%s biz=%s caller=%s channel=%s", uid, biz, caller, info["channel"])

    play_q: asyncio.Queue[bytes] = asyncio.Queue()
    stop = asyncio.Event()
    transcript: list[dict] = []
    ctx = {"uuid": uid, "biz": biz, "caller": caller, "channel": info["channel"], "stop": stop,
           "outcome": "answered", "transfer_target": None}

    try:
        prov = make_provider()
    except Exception as e:
        log.error("provider init failed: %s", e); writer.close(); return
    out_rate = getattr(prov, "OUT_RATE", prov.RATE)

    async def on_audio(pcm):
        pcm8 = resample(pcm, out_rate, config.AST_RATE)
        for i in range(0, len(pcm8), config.AST_FRAME_BYTES):
            await play_q.put(pcm8[i:i + config.AST_FRAME_BYTES])

    async def on_interrupt():
        n = 0
        while not play_q.empty():
            play_q.get_nowait(); n += 1
        if n: log.debug("interrupt: dropped %d frames", n)

    async def on_transcript(role, text):
        if text.strip():
            transcript.append({"t": round(time.time(), 2), "role": role, "text": text.strip()})
            log.info("%s: %s", role, text.strip())

    async def on_tool_call(name, args, call_id):
        return await tools.dispatch(name, args, ctx)

    prov.on_audio, prov.on_interrupt, prov.on_transcript, prov.on_tool_call = on_audio, on_interrupt, on_transcript, on_tool_call
    try:
        await asyncio.wait_for(prov.connect(load_prompt(biz), tools.schema()), timeout=15)
    except Exception as e:
        log.error("provider connect failed: %s", e)
        writer.close(); return           # TryExec in the dialplan sees FAILED and rings the humans

    async def player():
        frame_s = config.FRAME_MS / 1000
        next_t = None
        while not stop.is_set():
            try:
                chunk = await asyncio.wait_for(play_q.get(), timeout=0.25)
            except asyncio.TimeoutError:
                next_t = None            # idle, restart the clock on the next burst
                continue
            now = time.monotonic()
            if next_t is None or now - next_t > frame_s * LEAD_FRAMES:
                next_t = now - frame_s * (LEAD_FRAMES - 1)   # allow a small burst at the start
            if next_t > now:
                await asyncio.sleep(next_t - now)
            try:
                writer.write(audio_frame(chunk)); await writer.drain()
            except (ConnectionResetError, BrokenPipeError):
                stop.set(); break
            next_t += frame_s

    async def reader_loop():
        try:
            while not stop.is_set():
                t, payload = await read_frame(reader)
                if t == T_AUDIO:
                    await prov.send_audio(resample(payload, config.AST_RATE, prov.RATE))
                elif t in (T_HANGUP, T_ERROR):
                    break
        except (asyncio.IncompleteReadError, ConnectionResetError):
            pass
        except Exception as e:
            log.error("reader loop: %s", e)
        finally:
            stop.set()

    async def watchdog():
        try:
            await asyncio.wait_for(stop.wait(), timeout=config.MAX_CALL_SECONDS)
        except asyncio.TimeoutError:
            log.info("max call length reached"); stop.set()

    started = time.time()
    await asyncio.gather(reader_loop(), player(), watchdog())
    await prov.close()
    try:
        writer.write(hangup_frame()); await writer.drain()   # AudioSocket() returns 0, dialplan continues
    except Exception:
        pass
    writer.close()
    duration = int(time.time() - started)
    log.info("call end uid=%s dur=%ss outcome=%s", uid, duration, ctx["outcome"])
    try:
        s = await store.save_call(uid, biz, caller, duration, transcript, ctx["outcome"], recording)
        await notify.owner_summary(biz, caller, duration, s, ctx["outcome"])
    except Exception as e:
        log.error("post-call failed: %s", e)


async def main():
    host, port = config.env("AUDIOSOCKET_HOST", "127.0.0.1"), int(config.env("AUDIOSOCKET_PORT", "9092"))
    srv = await asyncio.start_server(handle_call, host, port)
    log.info("ai-bridge listening on %s:%s mode=%s tools=%s", host, port, config.AGENT_MODE, config.TOOLS_ENABLED)
    async with srv:
        await srv.serve_forever()


if __name__ == "__main__":
    logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"), format="%(asctime)s %(name)s %(levelname)s %(message)s")
    asyncio.run(main())
