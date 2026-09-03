"""Supabase REST (PostgREST) access + call summary."""
import json, logging, os, time, httpx

log = logging.getLogger("store")

def _h():
    k = os.environ["SUPABASE_SERVICE_KEY"]
    return {"apikey": k, "Authorization": f"Bearer {k}", "Content-Type": "application/json", "Prefer": "return=minimal"}

async def insert(table: str, row: dict) -> bool:
    async with httpx.AsyncClient(timeout=8) as c:
        r = await c.post(f"{os.environ['SUPABASE_URL']}/rest/v1/{table}", headers=_h(), json=row)
        if r.status_code >= 300: log.error("insert %s: %s %s", table, r.status_code, r.text)
        return r.status_code < 300

async def get_order(biz: str, order_id: str) -> dict | None:
    async with httpx.AsyncClient(timeout=6) as c:
        r = await c.get(f"{os.environ['SUPABASE_URL']}/rest/v1/orders", headers=_h(),
                        params={"biz": f"eq.{biz}", "order_id": f"eq.{order_id}", "select": "status,eta,items"})
        rows = r.json() if r.status_code == 200 else []
        return rows[0] if rows else None

async def summarise(transcript: list[dict]) -> dict:
    if not transcript:
        return {"summary": "কোনো কথোপকথন হয়নি", "intent": "other"}
    from openai import AsyncOpenAI
    text = "\n".join(f"{t['role']}: {t['text']}" for t in transcript)
    r = await AsyncOpenAI().chat.completions.create(
        model=os.getenv("SUMMARY_MODEL", "gpt-5-mini"),
        response_format={"type": "json_object"},
        messages=[{"role": "system", "content": "Return JSON {summary: 3 line Bangla summary, intent: one of price_query|order_status|complaint|booking|other, followup: Bangla one line what the owner should do or empty}"},
                  {"role": "user", "content": text}])
    try:
        return json.loads(r.choices[0].message.content)
    except Exception:
        return {"summary": text[:500], "intent": "other"}

async def save_call(uid, biz, caller, duration, transcript, outcome, recording):
    s = await summarise(transcript)
    await insert("calls", {"asterisk_uid": uid, "biz": biz, "caller": caller, "duration_sec": duration,
                           "transcript": transcript, "summary": s.get("summary"), "intent": s.get("intent"),
                           "followup": s.get("followup"), "outcome": outcome, "recording_path": recording})
    return s
