"""Minimal Asterisk Manager Interface client.

One short TCP session per operation (login, actions, logoff). Fine for a few calls per minute.
The dialplan stores  aibridge/<uuid> -> <channel name>  in AstDB, so the bridge can find the
channel that owns an AudioSocket UUID without parsing `core show channels`.
"""
import asyncio, logging, os

log = logging.getLogger("ami")

# `core show channels concise` field order, Asterisk 21 main/cli.c CONCISE_FORMAT_STRING:
# 0 name 1 context 2 exten 3 priority 4 state 5 app 6 data 7 callerid 8 accountcode
# 9 peeraccount 10 amaflags 11 duration 12 bridgeid 13 uniqueid
CONCISE_UNIQUEID_FIELD = 13


async def _session(actions: list[list[str]]) -> list[str]:
    r, w = await asyncio.open_connection(os.getenv("AMI_HOST", "127.0.0.1"), int(os.getenv("AMI_PORT", "5038")))
    try:
        await asyncio.wait_for(r.readline(), timeout=5)          # banner
        results = []

        async def send(block):
            w.write(("\r\n".join(block) + "\r\n\r\n").encode()); await w.drain()
            out = b""
            while True:
                line = await asyncio.wait_for(r.readline(), timeout=5)
                if not line: break
                out += line
                if line == b"\r\n": break
            return out.decode(errors="ignore")

        login = await send(["Action: Login", f"Username: {os.getenv('AMI_USER')}", f"Secret: {os.getenv('AMI_SECRET')}"])
        if "Success" not in login:
            raise RuntimeError(f"AMI login failed: {login.strip()}")
        for a in actions:
            results.append(await send(a))
        await send(["Action: Logoff"])
        return results
    finally:
        w.close()


def _lines(res: str) -> list[str]:
    """Response lines. Asterisk 14+ wraps CLI command output as 'Output: <line>' headers."""
    out = []
    for line in res.splitlines():
        out.append(line[8:] if line.startswith("Output: ") else line)
    return out


def _value(res: str) -> str | None:
    for line in _lines(res):
        if line.startswith("Value:"):
            v = line.split(":", 1)[1].strip()
            return v or None
    return None


async def channel_by_uuid(uid: str) -> str | None:
    """Channel name for an AudioSocket UUID. Primary: AstDB aibridge/<uuid> written by the dialplan.
    Fallback: match the uniqueid column of `core show channels concise` (if someone passes UNIQUEID)."""
    (res,) = await _session([["Action: Command", f"Command: database get aibridge {uid}"]])
    if (v := _value(res)):
        return v
    (res,) = await _session([["Action: Command", "Command: core show channels concise"]])
    for row in _lines(res):
        p = row.split("!")
        if len(p) > CONCISE_UNIQUEID_FIELD and p[CONCISE_UNIQUEID_FIELD] == uid:
            return p[0]
    return None


async def get_vars(channel: str, names: list[str]) -> dict[str, str | None]:
    """Read several channel variables in one AMI session."""
    res = await _session([["Action: Getvar", f"Channel: {channel}", f"Variable: {n}"] for n in names])
    return {n: _value(r) for n, r in zip(names, res)}


async def get_var(uid: str, var: str) -> str | None:
    ch = await channel_by_uuid(uid)
    if not ch: return None
    return (await get_vars(ch, [var]))[var]


async def set_var(channel: str, var: str, value: str) -> bool:
    (res,) = await _session([["Action: Setvar", f"Channel: {channel}", f"Variable: {var}", f"Value: {value}"]])
    return "Success" in res


async def redirect(channel: str, exten: str, context: str = "from-internal") -> bool:
    (res,) = await _session([["Action: Redirect", f"Channel: {channel}", f"Exten: {exten}", f"Context: {context}", "Priority: 1"]])
    return "Success" in res
