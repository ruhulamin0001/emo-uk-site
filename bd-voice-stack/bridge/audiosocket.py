"""Asterisk AudioSocket framing. https://docs.asterisk.org/Configuration/Channel-Drivers/AudioSocket/
frame = type(1 byte) + length(2 bytes big endian) + payload
0x00 hangup, 0x01 uuid(16 bytes), 0x10 audio (signed linear 16 bit, 8 kHz mono), 0xff error
"""
import asyncio, struct, uuid

T_HANGUP, T_UUID, T_AUDIO, T_ERROR = 0x00, 0x01, 0x10, 0xFF

async def read_frame(reader: asyncio.StreamReader) -> tuple[int, bytes]:
    hdr = await reader.readexactly(3)
    t = hdr[0]
    ln = struct.unpack("!H", hdr[1:3])[0]
    payload = await reader.readexactly(ln) if ln else b""
    return t, payload

def audio_frame(pcm: bytes) -> bytes:
    return bytes([T_AUDIO]) + struct.pack("!H", len(pcm)) + pcm

def hangup_frame() -> bytes:
    return bytes([T_HANGUP, 0, 0])

async def handshake(reader: asyncio.StreamReader) -> str:
    t, payload = await read_frame(reader)
    if t != T_UUID or len(payload) != 16:
        raise RuntimeError(f"expected UUID frame, got type={t} len={len(payload)}")
    return str(uuid.UUID(bytes=payload))
