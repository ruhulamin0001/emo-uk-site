"""OpenAI Realtime (GA) over WebSocket. Docs: https://platform.openai.com/docs/guides/realtime
Handles both GA event names and older beta names so a doc drift does not break calls.
"""
import asyncio, base64, json, logging, os, websockets
from .base import Provider

log = logging.getLogger("openai_rt")

class OpenAIRealtime(Provider):
    RATE = 24000

    def __init__(self):
        self.ws = None
        self._reader_task = None

    async def connect(self, instructions: str, tools: list[dict]) -> None:
        model = os.environ["OPENAI_REALTIME_MODEL"]
        self.ws = await websockets.connect(
            f"wss://api.openai.com/v1/realtime?model={model}",
            additional_headers={"Authorization": f"Bearer {os.environ['OPENAI_API_KEY']}"},
            max_size=None, ping_interval=20)
        session = {
            "type": "realtime",
            "instructions": instructions,
            "audio": {
                "input": {
                    "format": {"type": "audio/pcm", "rate": self.RATE},
                    "turn_detection": {"type": "server_vad", "threshold": 0.5,
                                       "prefix_padding_ms": 300, "silence_duration_ms": 600,
                                       "create_response": True, "interrupt_response": True},
                    "transcription": {"model": "gpt-4o-mini-transcribe", "language": "bn"},
                },
                "output": {"format": {"type": "audio/pcm", "rate": self.RATE},
                           "voice": os.getenv("OPENAI_VOICE", "marin")},
            },
            "tools": tools, "tool_choice": "auto",
        }
        await self._send({"type": "session.update", "session": session})
        self._reader_task = asyncio.create_task(self._reader())
        await self.say("কলটি বাংলায় এক বাক্যে অভ্যর্থনা দিয়ে শুরু করো এবং জানাও যে তুমি AI সহকারী।")

    async def _send(self, obj: dict):
        await self.ws.send(json.dumps(obj, ensure_ascii=False))

    async def send_audio(self, pcm: bytes) -> None:
        await self._send({"type": "input_audio_buffer.append", "audio": base64.b64encode(pcm).decode()})

    async def say(self, text: str) -> None:
        await self._send({"type": "response.create", "response": {"instructions": text}})

    async def _reader(self):
        try:
            async for raw in self.ws:
                ev = json.loads(raw)
                t = ev.get("type", "")
                if t in ("response.output_audio.delta", "response.audio.delta"):
                    await self.on_audio(base64.b64decode(ev["delta"]))
                elif t == "input_audio_buffer.speech_started":
                    await self.on_interrupt()
                elif t == "conversation.item.input_audio_transcription.completed":
                    await self.on_transcript("user", ev.get("transcript", ""))
                elif t in ("response.output_audio_transcript.done", "response.audio_transcript.done"):
                    await self.on_transcript("assistant", ev.get("transcript", ""))
                elif t == "response.function_call_arguments.done":
                    try:
                        args = json.loads(ev.get("arguments") or "{}")
                    except json.JSONDecodeError:
                        args = {}
                    result = await self.on_tool_call(ev["name"], args, ev["call_id"])
                    await self._send({"type": "conversation.item.create", "item": {
                        "type": "function_call_output", "call_id": ev["call_id"],
                        "output": json.dumps(result, ensure_ascii=False)}})
                    if not result.get("_no_response"):
                        await self._send({"type": "response.create"})
                elif t == "error":
                    log.error("openai error: %s", ev.get("error"))
        except websockets.ConnectionClosed as e:
            log.info("openai ws closed: %s", e)

    async def close(self) -> None:
        if self._reader_task: self._reader_task.cancel()
        if self.ws: await self.ws.close()
