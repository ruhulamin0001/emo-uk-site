"""STT + LLM + TTS pipeline (best Bangla voice, higher latency).
STT: OpenAI gpt-4o-mini-transcribe on utterance chunks (energy VAD). LLM: any OpenAI compatible chat API
(OpenAI, or DeepSeek via PIPELINE_LLM_BASE_URL=https://api.deepseek.com, PIPELINE_LLM=deepseek-chat).
TTS: ElevenLabs eleven_flash_v2_5, pcm_16000. Requires: pip install 'ai-bridge[pipeline]'
This is a reference implementation; T9 tunes VAD thresholds on real calls.
"""
import asyncio, io, json, logging, os, time, wave
import numpy as np
from .base import Provider

log = logging.getLogger("pipeline")

class Pipeline(Provider):
    RATE = 16000

    def __init__(self):
        self.buf = bytearray(); self.speaking = False; self.last_voice = 0.0
        self.history = []; self.tools = []; self.instructions = ""
        self._task = None; self._gen = None

    async def connect(self, instructions, tools):
        from openai import AsyncOpenAI
        self.oai = AsyncOpenAI()                      # STT (transcribe) always OpenAI
        base = os.getenv("PIPELINE_LLM_BASE_URL", "").strip()
        self.llm = AsyncOpenAI(base_url=base, api_key=os.getenv("PIPELINE_LLM_API_KEY") or os.getenv("OPENAI_API_KEY")) if base else self.oai
        self.instructions, self.tools = instructions, tools
        self._task = asyncio.create_task(self._vad_loop())
        await self.say("কলটি বাংলায় এক বাক্যে অভ্যর্থনা দিয়ে শুরু করো এবং জানাও যে তুমি AI সহকারী।")

    async def send_audio(self, pcm):
        x = np.frombuffer(pcm, dtype=np.int16).astype(np.float32)
        rms = float(np.sqrt(np.mean(x * x))) if len(x) else 0.0
        now = time.time()
        if rms > 500:                     # tune on real calls
            if not self.speaking:
                self.speaking = True
                if self._gen and not self._gen.done():
                    self._gen.cancel(); await self.on_interrupt()
            self.last_voice = now
        self.buf += pcm

    async def _vad_loop(self):
        while True:
            await asyncio.sleep(0.1)
            if self.speaking and time.time() - self.last_voice > 0.6:
                self.speaking = False
                audio, self.buf = bytes(self.buf), bytearray()
                asyncio.create_task(self._turn(audio))

    async def _turn(self, pcm):
        wav = io.BytesIO()
        with wave.open(wav, "wb") as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(self.RATE); w.writeframes(pcm)
        wav.seek(0); wav.name = "utt.wav"
        tr = await self.oai.audio.transcriptions.create(model="gpt-4o-mini-transcribe", file=wav, language="bn")
        text = tr.text.strip()
        if not text: return
        await self.on_transcript("user", text)
        self.history.append({"role": "user", "content": text})
        self._gen = asyncio.create_task(self._respond())

    async def say(self, text):
        self.history.append({"role": "user", "content": f"[system instruction] {text}"})
        self._gen = asyncio.create_task(self._respond())

    async def _respond(self):
        msgs = [{"role": "system", "content": self.instructions}] + self.history[-20:]
        tools = [{"type": "function", "function": {k: t[k] for k in ("name", "description", "parameters")}} for t in self.tools]
        r = await self.llm.chat.completions.create(model=os.getenv("PIPELINE_LLM", "gpt-5-mini"), messages=msgs,
                                                   tools=tools or None)
        m = r.choices[0].message
        if m.tool_calls:
            for tc in m.tool_calls:
                res = await self.on_tool_call(tc.function.name, json.loads(tc.function.arguments or "{}"), tc.id)
                self.history.append({"role": "assistant", "content": f"[tool {tc.function.name} -> {json.dumps(res, ensure_ascii=False)}]"})
                if res.get("say"): await self._tts(res["say"])
            return
        reply = (m.content or "").strip()
        if reply:
            self.history.append({"role": "assistant", "content": reply})
            await self.on_transcript("assistant", reply)
            await self._tts(reply)

    async def _tts(self, text):
        from elevenlabs.client import AsyncElevenLabs
        el = AsyncElevenLabs(api_key=os.environ["ELEVENLABS_API_KEY"])
        async for chunk in el.text_to_speech.convert_as_stream(
                voice_id=os.environ["ELEVENLABS_VOICE_ID"], model_id="eleven_flash_v2_5",
                text=text, output_format="pcm_16000", language_code="bn"):
            await self.on_audio(chunk)

    async def close(self):
        if self._task: self._task.cancel()
