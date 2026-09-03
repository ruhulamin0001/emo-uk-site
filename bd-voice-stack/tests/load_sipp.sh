#!/usr/bin/env bash
# usage: load_sipp.sh <concurrent> <seconds>   requires: apt install sip-tester ; a test extension 9999 -> ai-agent,biz1
apt-get install -y sip-tester >/dev/null 2>&1 || true
sipp -sn uac -s 9999 127.0.0.1:5060 -l "${1:-5}" -r 1 -d "${2:-600}000" -m "${1:-5}" -trace_err
