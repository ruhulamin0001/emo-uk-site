"""Call log storage in Postgres (the `db` container in docker-compose) + post call summary.

DATABASE_URL=postgresql://aibridge:<pass>@db:5432/aibridge . Schema: sql/schema.sql (applied by
scripts/vps-deploy.sh on every deploy, idempotent).
"""
import json, logging, os
import psycopg
from psycopg.types.json import Jsonb

log = logging.getLogger("store")


async def _conn():
    return await psycopg.AsyncConnection.connect(os.environ["DATABASE_URL"], connect_timeout=8, autocommit=True)


async def insert(table: str, row: dict) -> bool:
    if table not in ("calls", "callbacks", "orders"):
        raise ValueError(f"unknown table {table}")
    cols = list(row)
    vals = [Jsonb(v) if isinstance(v, (list, dict)) else v for v in row.values()]
    sql = f"insert into {table} ({', '.join(cols)}) values ({', '.join('%s' for _ in cols)})"
    try:
        async with await _conn() as c:
            await c.execute(sql, vals)
        return True
    except Exception as e:
        log.error("insert %s: %s", table, e)
        return False


async def get_order(biz: str, order_id: str) -> dict | None:
    try:
        async with await _conn() as c:
            cur = await c.execute("select status, eta, items from orders where biz=%s and order_id=%s", (biz, order_id))
            row = await cur.fetchone()
    except Exception as e:
        log.error("get_order: %s", e)
        return None
    return {"status": row[0], "eta": row[1], "items": row[2]} if row else None


async def summarise(transcript: list[dict]) -> dict:
    """Short Bangla summary + intent. Uses Gemini when GEMINI_API_KEY is set, else OpenAI."""
    if not transcript:
        return {"summary": "কোনো কথোপকথন হয়নি", "intent": "other"}
    text = "\n".join(f"{t['role']}: {t['text']}" for t in transcript)
    prompt = ("Return only JSON {\"summary\": 3 line Bangla summary, \"intent\": one of "
              "price_query|order_status|complaint|booking|other, \"followup\": Bangla one line what the owner should do or empty}")
    try:
        if os.getenv("GEMINI_API_KEY"):
            from google import genai
            client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
            r = await client.aio.models.generate_content(
                model=os.getenv("SUMMARY_MODEL", "gemini-2.5-flash"),
                contents=f"{prompt}\n\n{text}",
                config={"response_mime_type": "application/json"})
            return json.loads(r.text)
        from openai import AsyncOpenAI
        r = await AsyncOpenAI().chat.completions.create(
            model=os.getenv("SUMMARY_MODEL", "gpt-5-mini"),
            response_format={"type": "json_object"},
            messages=[{"role": "system", "content": prompt}, {"role": "user", "content": text}])
        return json.loads(r.choices[0].message.content)
    except Exception as e:
        log.error("summarise: %s", e)
        return {"summary": text[:500], "intent": "other"}


async def save_call(uid, biz, caller, duration, transcript, outcome, recording):
    s = await summarise(transcript)
    await insert("calls", {"asterisk_uid": uid, "biz": biz, "caller": caller, "duration_sec": duration,
                           "transcript": transcript, "summary": s.get("summary"), "intent": s.get("intent"),
                           "followup": s.get("followup"), "outcome": outcome, "recording_path": recording})
    return s
