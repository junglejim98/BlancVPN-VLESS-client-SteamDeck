#!/usr/bin/env bash
set -euo pipefail

echo "== PROCESSES =="
if [ -f /tmp/xray.pid ] && kill -0 "$(cat /tmp/xray.pid)" 2>/dev/null; then
  echo "xray: RUNNING (pid $(cat /tmp/xray.pid))"
else
  echo "xray: STOPPED"
fi

if [ -f /tmp/tun2socks.pid ] && kill -0 "$(cat /tmp/tun2socks.pid)" 2>/dev/null; then
  echo "tun2socks: RUNNING (pid $(cat /tmp/tun2socks.pid))"
else
  echo "tun2socks: STOPPED"
fi

echo
echo "== SOCKS LISTEN =="
ss -lntp 2>/dev/null | grep ':1080' || echo "1080: not listening"

echo
echo "== TUN INTERFACE =="
ip link show tun0 2>/dev/null || echo "tun0: not found"

echo
echo "== ROUTES (top) =="
ip route | head -n 20

echo
echo "== PUBLIC IP (DIRECT) =="
curl -sS --max-time 4 https://ipinfo.io/ip || echo "curl direct: failed"

echo
echo "== PUBLIC IP (SOCKS) =="
curl -sS --max-time 6 --socks5-hostname 127.0.0.1:1080 https://ipinfo.io/ip || echo "curl socks: failed"
