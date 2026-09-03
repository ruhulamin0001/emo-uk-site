import logging
from . import ami, config, store, notify

log = logging.getLogger("tools")

ALL = {
  "transfer_to_human": {"type": "function", "name": "transfer_to_human",
     "description": "কলারকে একজন মানুষের কাছে transfer করো। কলার চাইলে, রেগে গেলে, বা দুইবার না বুঝলে।",
     "parameters": {"type": "object", "properties": {"reason": {"type": "string"}}, "required": ["reason"]}},
  "lookup_order": {"type": "function", "name": "lookup_order",
     "description": "অর্ডার নম্বর দিয়ে অর্ডারের অবস্থা জানাও।",
     "parameters": {"type": "object", "properties": {"order_id": {"type": "string"}}, "required": ["order_id"]}},
  "request_callback": {"type": "function", "name": "request_callback",
     "description": "কলারের নাম, নম্বর ও বিষয় নিয়ে কল ব্যাক রিকোয়েস্ট তৈরি করো।",
     "parameters": {"type": "object", "properties": {"name": {"type": "string"}, "phone": {"type": "string"},
                    "topic": {"type": "string"}}, "required": ["phone", "topic"]}},
  "send_sms": {"type": "function", "name": "send_sms",
     "description": "কলারের নম্বরে ঠিকানা বা লিংক SMS করো।",
     "parameters": {"type": "object", "properties": {"text": {"type": "string"}}, "required": ["text"]}},
}


def schema() -> list[dict]:
    return [ALL[n] for n in config.TOOLS_ENABLED if n in ALL]


async def transfer(ctx: dict) -> bool:
    """Set TRANSFER_TARGET on the channel, then end the AudioSocket session. The dialplan
    ([ai-agent] in extensions_custom.conf) does Goto(from-internal,<ring group>,1) itself.
    Fallback for an odd dialplan: AMI Redirect."""
    target = config.HUMAN_RING_GROUPS.get(ctx["biz"])
    ch = ctx.get("channel")
    if not target or not ch:
        return False
    ok = await ami.set_var(ch, "TRANSFER_TARGET", target)
    if not ok:
        ok = await ami.redirect(ch, target)
    if ok:
        ctx["transfer_target"] = target
        log.info("transfer ok biz=%s -> %s channel=%s", ctx["biz"], target, ch)
    return ok


async def dispatch(name: str, args: dict, ctx: dict) -> dict:
    biz, caller = ctx["biz"], ctx["caller"]
    log.info("tool %s %s biz=%s", name, args, biz)
    try:
        if name == "transfer_to_human":
            if await transfer(ctx):
                ctx["outcome"] = "transferred"; ctx["stop"].set()
                return {"ok": True, "_no_response": True}
            return {"ok": False, "say": "এই মুহূর্তে কেউ ফ্রি নেই। আপনার নম্বরে কল ব্যাক করা হবে, বিষয়টা বলুন।"}
        if name == "lookup_order":
            row = await store.get_order(biz, str(args.get("order_id", "")).strip())
            return row or {"status": "not_found", "say": "এই অর্ডার নম্বর পাওয়া যায়নি, নম্বরটা আবার বলুন।"}
        if name == "request_callback":
            await store.insert("callbacks", {"biz": biz, "caller": caller, "name": args.get("name"),
                                             "phone": args.get("phone") or caller, "topic": args.get("topic")})
            ctx["outcome"] = "callback"
            return {"ok": True, "say": "ধন্যবাদ, আমাদের প্রতিনিধি শীঘ্রই কল করবেন।"}
        if name == "send_sms":
            ok = await notify.sms(caller, args.get("text", ""))
            return {"ok": ok}
    except Exception as e:
        log.error("tool %s failed: %s", name, e)
        return {"ok": False, "error": str(e), "say": "একটু সমস্যা হচ্ছে, আবার বলুন।"}
    return {"error": "unknown tool"}
