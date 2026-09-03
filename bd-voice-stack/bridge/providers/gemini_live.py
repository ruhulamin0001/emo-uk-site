"""Google Gemini Live API (native audio). Docs: https://ai.google.dev/gemini-api/docs/live
Input 16 kHz PCM, output 24 kHz PCM. Requires: pip install google-genai
"""
import asyncio, logging, os
from .base import Provider

log = logging.getLogger("gemini_live")

class GeminiLive(Provider):
    RATE = 16000          # we send 16k; output arrives at 24k and is resampled in on_audio wrapper
    OUT_RATE = 24000

    def __init__(self):
        self.session = None
        self._ctx = None
        self._reader_task = None

    async def connect(self, instructions: str, tools: list[dict]) -> None:
        from google import genai
        from google.genai import types
        client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
        fdecl = [types.FunctionDeclaration(name=t["name"], description=t["description"], parameters=t["parameters"]) for t in tools]
        cfg = types.LiveConnectConfig(
            response_modalities=["AUDIO"],
            system_instruction=instructions,
            tools=[types.Tool(function_declarations=fdecl)] if fdecl else None,
            input_audio_transcription=types.AudioTranscriptionConfig(),
            output_audio_transcription=types.AudioTranscriptionConfig(),
            realtime_input_config=types.RealtimeInputConfig(
                automatic_activity_detection=types.AutomaticActivityDetection(
                    silence_duration_ms=600, prefix_padding_ms=200)),
        )
        self._ctx = client.aio.live.connect(model=os.environ["GEMINI_LIVE_MODEL"], config=cfg)
        self.session = await self._ctx.__aenter__()
        self._reader_task = asyncio.create_task(self._reader())
        await self.say("কলটি বাংলায় এক বাক্যে অভ্যর্থনা দিয়ে শুরু করো এবং জানাও যে তুমি AI সহকারী।")

    async def send_audio(self, pcm: bytes) -> None:
        from google.genai import types
        await self.session.send_realtime_input(audio=types.Blob(data=pcm, mime_type=f"audio/pcm;rate={self.RATE}"))

    async def say(self, text: str) -> None:
        await self.session.send_client_content(turns={"role": "user", "parts": [{"text": text}]}, turn_complete=True)

    async def _reader(self):
        from google.genai import types
        from ..resample import resample
        try:
            while True:
                async for msg in self.session.receive():
                    sc = msg.server_content
                    if sc:
                        if sc.interrupted:
                            await self.on_interrupt()
                        if sc.model_turn:
                            for part in sc.model_turn.parts:
                                if part.inline_data and part.inline_data.data:
                                    await self.on_audio(part.inline_data.data)   # 24 kHz
                        if sc.input_transcription and sc.input_transcription.text:
                            await self.on_transcript("user", sc.input_transcription.text)
                        if sc.output_transcription and sc.output_transcription.text:
                            await self.on_transcript("assistant", sc.output_transcription.text)
                    if msg.tool_call:
                        responses = []
                        for fc in msg.tool_call.function_calls:
                            result = await self.on_tool_call(fc.name, dict(fc.args or {}), fc.id)
                            responses.append(types.FunctionResponse(id=fc.id, name=fc.name, response=result))
                        await self.session.send_tool_response(function_responses=responses)
        except asyncio.CancelledError:
            pass
        except Exception as e:
            log.error("gemini reader: %s", e)

    async def close(self) -> None:
        if self._reader_task: self._reader_task.cancel()
        if self._ctx:
            try: await self._ctx.__aexit__(None, None, None)
            except Exception: pass
