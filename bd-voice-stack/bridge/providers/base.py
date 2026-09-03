"""Every provider implements this interface so main.py does not care which one runs."""
from typing import Awaitable, Callable

class Provider:
    RATE: int = 24000                       # sample rate the provider wants (in and out)
    on_audio: Callable[[bytes], Awaitable[None]]
    on_interrupt: Callable[[], Awaitable[None]]
    on_transcript: Callable[[str, str], Awaitable[None]]
    on_tool_call: Callable[[str, dict, str], Awaitable[dict]]

    async def connect(self, instructions: str, tools: list[dict]) -> None: ...
    async def send_audio(self, pcm: bytes) -> None: ...
    async def say(self, text: str) -> None: ...      # force the agent to speak a given line
    async def close(self) -> None: ...
