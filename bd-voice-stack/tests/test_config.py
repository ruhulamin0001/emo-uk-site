import importlib, os, sys


def test_env_map_and_defaults(monkeypatch, tmp_path):
    env = tmp_path / ".env"
    env.write_text("AGENT_MODE=realtime_gemini\nHUMAN_RING_GROUPS=biz1:601,biz2:602,biz3:\nTOOLS_ENABLED=transfer_to_human,lookup_order\n")
    monkeypatch.setenv("AI_BRIDGE_ENV", str(env))
    for k in ("AGENT_MODE", "HUMAN_RING_GROUPS", "TOOLS_ENABLED"):
        monkeypatch.delenv(k, raising=False)
    sys.modules.pop("bridge.config", None)
    cfg = importlib.import_module("bridge.config")
    assert cfg.AGENT_MODE == "realtime_gemini"
    assert cfg.HUMAN_RING_GROUPS == {"biz1": "601", "biz2": "602"}
    assert cfg.TOOLS_ENABLED == ["transfer_to_human", "lookup_order"]
    assert cfg.AST_FRAME_BYTES == 320


def test_env_example_has_no_inline_comments():
    """systemd EnvironmentFile keeps a trailing '# comment' as part of the value."""
    here = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    for line in open(os.path.join(here, "deploy", "env.example"), encoding="utf-8"):
        if "=" in line and not line.startswith("#"):
            assert "#" not in line.split("=", 1)[1], line
