"""Render the Asterisk config from the sample CSVs and check the parts that matter."""
import importlib.util, os, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCRIPT = ROOT / "scripts" / "render_conf.py"

TRUNKS = """biz,name,number,host,port,username,secret,channels,codecs,register
biz1,biz1_a,09666000001,sip.op.example,5060,09666000001,pw1,2,"ulaw,alaw",yes
biz1,biz1_b,09666000002,sip.op.example,5060,09666000002,pw2,2,"ulaw,alaw",yes
biz2,biz2_a,09611000003,sip.amber.example,5060,09611000003,pw3,2,ulaw,yes
"""
EXTS = """extension,name,biz
101,biz1 reception,biz1
102,biz1 sales,biz1
201,biz2 reception,biz2
"""
ENV = "PUBLIC_IP=72.62.213.196\nPBX_DOMAIN=aiagent.jagatitlimited.com\nAMI_USER=aibridge\nAMI_SECRET=s3cret\nRTP_START=10000\nRTP_FINISH=10200\n"


def render(tmp_path):
    (tmp_path / "deploy").mkdir(exist_ok=True)
    (tmp_path / "deploy" / "trunks.csv").write_text(TRUNKS)
    (tmp_path / "deploy" / "extensions.csv").write_text(EXTS)
    (tmp_path / ".env").write_text(ENV)
    out = tmp_path / "etc"
    r = subprocess.run([sys.executable, str(SCRIPT), "--root", str(tmp_path), "--out", str(out)], capture_output=True, text=True)
    assert r.returncode == 0, r.stdout + r.stderr
    return {f.name: f.read_text() for f in out.iterdir()}


def test_pjsip_trunks_and_extensions(tmp_path):
    f = render(tmp_path)
    p = f["pjsip.conf"]
    assert "external_media_address=72.62.213.196" in p
    assert "[biz1_a]\ntype=registration" in p and "line=yes" in p            # inbound matched per registration
    assert "client_uri=sip:09666000001@sip.op.example" in p
    assert "set_var=BIZ=biz2" in p and "set_var=DID=09611000003" in p
    assert "[101]\ntype=endpoint" in p and 'callerid="biz1 reception" <101>' in p
    assert "password=pw3" in p
    secrets = (tmp_path / "deploy" / "extension_secrets.txt").read_text().split()
    assert secrets[0] == "101" and len(secrets[1]) >= 20
    # re-render keeps the same extension password
    f2 = render(tmp_path)
    assert f2["pjsip.conf"] == p


def test_dialplan_routing(tmp_path):
    f = render(tmp_path)
    e = f["extensions.conf"]
    assert "TryExec(AudioSocket(${AI_UUID},ai-bridge:9092))" in e
    assert "Set(AI_UUID=${UUID()})" in e
    assert "exten => 601,1,NoOp(ring group biz1)\n same => n,Dial(PJSIP/101&PJSIP/102,25)" in e
    assert "exten => 602,1,NoOp(ring group biz2)\n same => n,Dial(PJSIP/201,25)" in e
    assert "exten => biz1,1,Goto(from-internal,601,1)" in e
    # outbound pinned to business, failover to the second trunk, no ISD pattern
    assert "n(biz1),Set(CALLERID(num)=09666000001)" in e
    assert "Dial(PJSIP/${ARG1}@biz1_a,60)" in e and "Dial(PJSIP/${ARG1}@biz1_b,60)" in e
    assert "n(biz2),Set(CALLERID(num)=09611000003)" in e
    assert "_00" not in e and "_+" not in e
    assert "Hangup(21)" in e


def test_manager_and_rtp(tmp_path):
    f = render(tmp_path)
    assert "[aibridge]\nsecret=s3cret" in f["manager.conf"] and "permit=172.16.0.0/255.240.0.0" in f["manager.conf"]
    assert "rtpstart=10000\nrtpend=10200" in f["rtp.conf"]
    assert "astdbdir => /var/lib/asterisk/db" in f["asterisk.conf"]


def test_refuses_placeholder_secrets(tmp_path):
    (tmp_path / "deploy").mkdir(exist_ok=True)
    (tmp_path / "deploy" / "trunks.csv").write_text(TRUNKS.replace("pw1", "CHANGE_ME"))
    (tmp_path / "deploy" / "extensions.csv").write_text(EXTS)
    (tmp_path / ".env").write_text(ENV)
    r = subprocess.run([sys.executable, str(SCRIPT), "--root", str(tmp_path), "--out", str(tmp_path / "etc")], capture_output=True, text=True)
    assert r.returncode != 0 and "CHANGE_ME" in r.stderr
