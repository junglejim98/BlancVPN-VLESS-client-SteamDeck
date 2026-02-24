#!/usr/bin/env bash

set -euo pipefail

VPN_SERVER_IP="${VPN_SERVER_IP:-}"

echo "[1] Удаление маршрутов..."
sudo ip route del 0.0.0.0/1 dev tun0 2>/dev/null || true
sudo ip route del 128.0.0.0/1 dev tun0 2>/dev/null || true
if [ -n "$VPN_SERVER_IP" ]; then
  sudo ip route del "${VPN_SERVER_IP}/32" 2>/dev/null || true
fi

echo "[2] Удаление tun0..."
sudo ip link delete tun0 2>/dev/null || true

echo "[3] Завершение процессов..."
if [ -f /tmp/tun2socks.pid ]; then
  kill "$(cat /tmp/tun2socks.pid)" 2>/dev/null || true
fi
if [ -f /tmp/v2ray.pid ]; then
  kill "$(cat /tmp/v2ray.pid)" 2>/dev/null || true
fi
rm -f /tmp/v2ray.pid /tmp/tun2socks.pid

echo "❎ VPN остановлен"
