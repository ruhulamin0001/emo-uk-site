"""AMI client against a fake manager: login, database get, Getvar, Setvar."""
import asyncio, os
import pytest
from bridge import ami

CHANNEL = "PJSIP/biz1_a-00000012"
UUID = "0f7f4f6e-2c2b-4a4b-9a2c-1b2c3d4e5f60"


async def fake_ami(reader, writer):
    writer.write(b"Asterisk Call Manager/9.0.0\r\n")
    block = []
    while True:
        line = await reader.readline()
        if not line:
            break
        if line == b"\r\n":
            req = dict(l.split(": ", 1) for l in "".join(block).strip().split("\r\n") if ": " in l)
            block = []
            a = req.get("Action")
            if a == "Login":
                ok = req.get("Username") == "aibridge" and req.get("Secret") == "s3cret"
                writer.write(b"Response: Success\r\nMessage: Authentication accepted\r\n\r\n" if ok
                             else b"Response: Error\r\nMessage: Authentication failed\r\n\r\n")
            elif a == "Command" and req.get("Command") == f"database get aibridge {UUID}":
                writer.write(f"Response: Success\r\nMessage: Command output follows\r\nOutput: Value: {CHANNEL}\r\n\r\n".encode())
                # older Asterisk prints the output as plain lines instead of Output: headers
            elif a == "Command" and req.get("Command", "").startswith("database get"):
                writer.write(b"Response: Error\r\nMessage: Database entry not found\r\n\r\n")
            elif a == "Command":
                writer.write(("Response: Success\r\nMessage: Command output follows\r\n"
                              f"Output: {CHANNEL}!ai-agent!biz1!11!Up!AudioSocket!{UUID},127.0.0.1:9092!01711000000!biz1!!3!00:00:07!!1725300000.12\r\n\r\n").encode())
            elif a == "Getvar":
                v = {"BIZ": "biz1", "CALLERID(num)": "01711000000", "CALLFILENAME": "x.wav"}.get(req.get("Variable"), "")
                writer.write(f"Response: Success\r\nVariable: {req.get('Variable')}\r\nValue: {v}\r\n\r\n".encode())
            elif a == "Setvar":
                writer.write(b"Response: Success\r\nMessage: Variable Set\r\n\r\n")
            elif a == "Logoff":
                writer.write(b"Response: Goodbye\r\nMessage: Thanks for all the fish.\r\n\r\n")
                await writer.drain(); writer.close(); return
            await writer.drain()
        else:
            block.append(line.decode())


@pytest.fixture
def server(monkeypatch):
    async def run(coro, secret):
        srv = await asyncio.start_server(fake_ami, "127.0.0.1", 0)
        port = srv.sockets[0].getsockname()[1]
        monkeypatch.setenv("AMI_HOST", "127.0.0.1"); monkeypatch.setenv("AMI_PORT", str(port))
        monkeypatch.setenv("AMI_USER", "aibridge"); monkeypatch.setenv("AMI_SECRET", secret)
        async with srv:
            return await coro
    return lambda coro, secret="s3cret": asyncio.run(run(coro, secret))


def test_channel_by_uuid_from_astdb(server):
    assert server(ami.channel_by_uuid(UUID)) == CHANNEL


def test_channel_by_uniqueid_fallback(server):
    # concise output has uniqueid in field 13; the fallback must find it there
    assert server(ami.channel_by_uuid("1725300000.12")) == CHANNEL
    assert server(ami.channel_by_uuid("no-such")) is None


def test_get_vars_and_set_var(server):
    v = server(ami.get_vars(CHANNEL, ["BIZ", "CALLERID(num)", "NOPE"]))
    assert v == {"BIZ": "biz1", "CALLERID(num)": "01711000000", "NOPE": None}
    assert server(ami.set_var(CHANNEL, "TRANSFER_TARGET", "601")) is True


def test_bad_login_raises(server):
    with pytest.raises(RuntimeError):
        server(ami.channel_by_uuid(UUID), secret="wrong")
