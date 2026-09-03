#!/usr/bin/env bash
# Sends a fake AudioSocket session (uuid + 2 s silence + hangup) to the bridge; passes if the bridge accepts and closes cleanly.
set -e
python3 - <<'PY'
import socket, struct, uuid, time
s = socket.create_connection(("127.0.0.1", 9092), timeout=5)
u = uuid.uuid4().bytes
s.sendall(bytes([0x01]) + struct.pack("!H", 16) + u)
for _ in range(100):
    s.sendall(bytes([0x10]) + struct.pack("!H", 320) + b"\x00" * 320); time.sleep(0.02)
s.sendall(bytes([0x00, 0, 0]))
s.settimeout(3)
try:
    data = s.recv(3)
    print("bridge responded", data)
except socket.timeout:
    print("no audio back (ok without a real channel)")
s.close(); print("SMOKE OK")
PY
