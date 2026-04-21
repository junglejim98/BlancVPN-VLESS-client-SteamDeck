#!/usr/bin/env bash

set -euo pipefail

VPN_SERVER_IP="${VPN_SERVER_IP:-}"

run_root_cleanup() {
  local script='
ip route del 0.0.0.0/1 dev tun0 2>/dev/null || true
ip route del 128.0.0.0/1 dev tun0 2>/dev/null || true
if [ -n "$VPN_SERVER_IP" ]; then
  ip route del "${VPN_SERVER_IP}/32" 2>/dev/null || true
fi
ip link delete tun0 2>/dev/null || true
'

  if [ "$(id -u)" -eq 0 ]; then
    VPN_SERVER_IP="$VPN_SERVER_IP" bash -c "$script"
    return
  fi

  if command -v pkexec >/dev/null 2>&1; then
    pkexec env VPN_SERVER_IP="$VPN_SERVER_IP" bash -c "$script"
    return
  fi

  sudo env VPN_SERVER_IP="$VPN_SERVER_IP" bash -c "$script"
}

echo "[1] Удаление маршрутов..."
echo "[2] Удаление tun0..."
run_root_cleanup

echo "[3] Завершение процессов..."
if [ -f /tmp/tun2socks.pid ]; then
  kill "$(cat /tmp/tun2socks.pid)" 2>/dev/null || true
fi
if [ -f /tmp/xray.pid ]; then
  kill "$(cat /tmp/xray.pid)" 2>/dev/null || true
fi
rm -f /tmp/xray.pid /tmp/tun2socks.pid

echo "❎ VPN остановлен"
