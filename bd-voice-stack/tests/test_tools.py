import asyncio
from bridge import tools, config


def test_schema_filters_enabled(monkeypatch):
    monkeypatch.setattr(config, "TOOLS_ENABLED", ["lookup_order", "nope"])
    assert [t["name"] for t in tools.schema()] == ["lookup_order"]


def test_transfer_sets_variable_then_stops(monkeypatch):
    calls = []
    async def set_var(ch, var, val): calls.append((ch, var, val)); return True
    monkeypatch.setattr(tools.ami, "set_var", set_var)
    monkeypatch.setattr(config, "HUMAN_RING_GROUPS", {"biz2": "602"})
    ctx = {"biz": "biz2", "caller": "x", "uuid": "u", "channel": "PJSIP/biz2_a-1", "stop": asyncio.Event(), "outcome": "answered"}
    res = asyncio.run(tools.dispatch("transfer_to_human", {"reason": "asked"}, ctx))
    assert res == {"ok": True, "_no_response": True}
    assert calls == [("PJSIP/biz2_a-1", "TRANSFER_TARGET", "602")]
    assert ctx["outcome"] == "transferred" and ctx["stop"].is_set()


def test_transfer_without_channel_offers_callback():
    ctx = {"biz": "biz1", "caller": "x", "uuid": "u", "channel": None, "stop": asyncio.Event(), "outcome": "answered"}
    res = asyncio.run(tools.dispatch("transfer_to_human", {"reason": "asked"}, ctx))
    assert res["ok"] is False and "say" in res and not ctx["stop"].is_set()
