import os
from dotenv import load_dotenv

load_dotenv(os.getenv("AI_BRIDGE_ENV", "/opt/ai-bridge/.env"))

def env(k: str, default: str | None = None) -> str:
    v = os.getenv(k, default)
    if v is None:
        raise RuntimeError(f"missing env {k}")
    return v

def env_map(k: str) -> dict[str, str]:
    """'biz1:601,biz2:602' -> {'biz1': '601', 'biz2': '602'}"""
    out = {}
    for part in env(k, "").split(","):
        if ":" in part:
            a, b = part.split(":", 1)
            if b.strip():
                out[a.strip()] = b.strip()
    return out

AGENT_MODE = env("AGENT_MODE", "realtime_openai")
AST_RATE = int(env("ASTERISK_RATE", "8000"))
FRAME_MS = 20
AST_FRAME_BYTES = AST_RATE * 2 * FRAME_MS // 1000
TOOLS_ENABLED = [t for t in env("TOOLS_ENABLED", "").split(",") if t]
HUMAN_RING_GROUPS = env_map("HUMAN_RING_GROUPS")
OWNER_CHAT_IDS = env_map("OWNER_CHAT_IDS")
OWNER_WHATSAPP = env_map("OWNER_WHATSAPP")
MAX_CALL_SECONDS = int(env("MAX_CALL_SECONDS", "600"))
PROMPT_DIR = env("PROMPT_DIR", "/opt/ai-bridge/prompts")
