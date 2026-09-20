import asyncio, struct, uuid
from bridge.audiosocket import read_frame, audio_frame, handshake, T_AUDIO

def test_audio_frame_roundtrip():
    f = audio_frame(b"\x01\x02" * 160)
    assert f[0] == T_AUDIO and struct.unpack("!H", f[1:3])[0] == 320

def test_handshake():
    async def run():
        r = asyncio.StreamReader()
        u = uuid.uuid4()
        r.feed_data(bytes([0x01]) + struct.pack("!H", 16) + u.bytes); r.feed_eof()
        return await handshake(r), u
    got, u = asyncio.run(run())
    assert got == str(u)
