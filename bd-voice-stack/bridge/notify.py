import logging, os, httpx
from . import config

log = logging.getLogger("notify")

async def telegram(biz: str, text: str) -> bool:
    chat = config.OWNER_CHAT_IDS.get(biz) or config.OWNER_CHAT_IDS.get("biz1")
    if not chat: return False
    async with httpx.AsyncClient(timeout=10) as c:
        r = await c.post(f"https://api.telegram.org/bot{os.environ['TELEGRAM_BOT_TOKEN']}/sendMessage",
                         json={"chat_id": chat, "text": text})
        return r.status_code == 200

async def whatsapp(biz: str, params: list[str]) -> bool:
    to = config.OWNER_WHATSAPP.get(biz)
    if not to or not os.getenv("WHATSAPP_TOKEN"): return False
    async with httpx.AsyncClient(timeout=10) as c:
        r = await c.post(f"https://graph.facebook.com/v21.0/{os.environ['WHATSAPP_PHONE_ID']}/messages",
            headers={"Authorization": f"Bearer {os.environ['WHATSAPP_TOKEN']}"},
            json={"messaging_product": "whatsapp", "to": to, "type": "template",
                  "template": {"name": "call_summary", "language": {"code": "bn"},
                               "components": [{"type": "body", "parameters": [{"type": "text", "text": p[:900]} for p in params]}]}})
        if r.status_code >= 300: log.error("whatsapp: %s", r.text)
        return r.status_code < 300

async def owner_summary(biz, caller, duration, s: dict, outcome: str):
    text = (f"[{biz}] কল থেকে {caller}, {duration}s, ফলাফল: {outcome}\n"
            f"{s.get('summary','')}\n" + (f"করণীয়: {s['followup']}" if s.get("followup") else ""))
    chans = os.getenv("NOTIFY", "telegram").split(",")
    if "telegram" in chans: await telegram(biz, text)
    if "whatsapp" in chans: await whatsapp(biz, [biz, caller, f"{duration}s", s.get("summary", "")])

async def sms(to: str, text: str) -> bool:
    # Plug the operator's bulk SMS HTTP API here (most IPTSP resellers provide one). Placeholder logs only.
    log.info("SMS to %s: %s", to, text)
    return True
