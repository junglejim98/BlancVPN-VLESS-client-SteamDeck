#!/usr/bin/env bash
set -euo pipefail

echo "== xray_error.log =="
tail -n 200 /tmp/xray_error.log 2>/dev/null || echo "no /tmp/xray_error.log"

echo
echo "== xray.log =="
tail -n 200 /tmp/xray.log 2>/dev/null || echo "no /tmp/xray.log"

echo
echo "== tun2socks.log =="
tail -n 200 /tmp/tun2socks.log 2>/dev/null || echo "no /tmp/tun2socks.log"
