import asyncio
from bridge import store


class FakeCursor:
    def __init__(self, row): self.row = row
    async def fetchone(self): return self.row


class FakeConn:
    def __init__(self, row=None): self.row = row; self.calls = []
    async def __aenter__(self): return self
    async def __aexit__(self, *a): return False
    async def execute(self, sql, params=None):
        self.calls.append((sql, params)); return FakeCursor(self.row)


def test_insert_builds_parameterised_sql(monkeypatch):
    conn = FakeConn()
    async def fake(): return conn
    monkeypatch.setattr(store, "_conn", fake)
    ok = asyncio.run(store.insert("callbacks", {"biz": "biz1", "phone": "017", "topic": "price"}))
    assert ok
    sql, params = conn.calls[0]
    assert sql == "insert into callbacks (biz, phone, topic) values (%s, %s, %s)"
    assert params == ["biz1", "017", "price"]


def test_insert_rejects_unknown_table():
    try:
        asyncio.run(store.insert("users", {"a": 1}))
    except ValueError:
        return
    assert False, "expected ValueError"


def test_get_order(monkeypatch):
    conn = FakeConn(row=("shipped", "tomorrow", "2 shirts"))
    async def fake(): return conn
    monkeypatch.setattr(store, "_conn", fake)
    assert asyncio.run(store.get_order("biz1", "1001")) == {"status": "shipped", "eta": "tomorrow", "items": "2 shirts"}
    assert conn.calls[0][1] == ("biz1", "1001")


def test_summarise_empty():
    assert asyncio.run(store.summarise([]))["intent"] == "other"
