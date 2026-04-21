#!/usr/bin/env bash

set -euo pipefail

SOCKS_PORT="${SOCKS_PORT:-1080}"
VPN_SERVER_IP="${VPN_SERVER_IP:?VPN_SERVER_IP is required}"

xray_BIN="$HOME/xray/xray"
xray_CFG="$HOME/.config/xray/config.json"
TUN2SOCKS_BIN="$HOME/tun2socks/tun2socks"

xray_LOG="/tmp/xray.log"
TUN_LOG="/tmp/tun2socks.log"
TARGET_USER="${TARGET_USER:-$(id -un)}"

run_root_network_setup() {
  local script='
ip link delete tun0 2>/dev/null || true
ip tuntap add dev tun0 mode tun user "$TARGET_USER" 2>/dev/null || true
ip link set tun0 up
ip route replace "${VPN_SERVER_IP}/32" via "$GATEWAY" dev "$IFACE"
ip route replace 0.0.0.0/1 dev tun0
ip route replace 128.0.0.0/1 dev tun0
'

  if [ "$(id -u)" -eq 0 ]; then
    VPN_SERVER_IP="$VPN_SERVER_IP" GATEWAY="$GATEWAY" IFACE="$IFACE" TARGET_USER="$TARGET_USER" bash -c "$script"
    return
  fi

  if command -v pkexec >/dev/null 2>&1; then
    pkexec env VPN_SERVER_IP="$VPN_SERVER_IP" GATEWAY="$GATEWAY" IFACE="$IFACE" TARGET_USER="$TARGET_USER" bash -c "$script"
    return
  fi

  sudo env VPN_SERVER_IP="$VPN_SERVER_IP" GATEWAY="$GATEWAY" IFACE="$IFACE" TARGET_USER="$TARGET_USER" bash -c "$script"
}

cleanup() {
  echo "[!] Ошибка — откат (stop-vpn.sh)..."
  bash "$(dirname "$0")/stop-vpn.sh" || true
}
trap cleanup ERR INT TERM

GATEWAY=$(ip route | awk '/default/ {print $3; exit}')
IFACE=$(ip route | awk '/default/ {print $5; exit}')

echo "[1] Запуск xray..."
nohup "$xray_BIN" run -config "$xray_CFG" >> "$xray_LOG" 2>&1 &
echo $! > /tmp/xray.pid
sleep 1

echo "[1.1] Проверка SOCKS (до маршрутов)..."
curl -sS --max-time 6 --socks5-hostname "127.0.0.1:${SOCKS_PORT}" https://ipinfo.io/ip \
  | tee /tmp/vpn_ip_socks.txt >/dev/null
echo "✅ SOCKS OK, IP: $(cat /tmp/vpn_ip_socks.txt)"

echo "[2] Настройка tun0 и маршрутов..."
run_root_network_setup

echo "[3] Запуск tun2socks..."
nohup "$TUN2SOCKS_BIN" \
  -device tun://tun0 \
  -proxy "socks5://127.0.0.1:${SOCKS_PORT}" \
  -loglevel info >> "$TUN_LOG" 2>&1 &
echo $! > /tmp/tun2socks.pid
sleep 1

echo "[3.1] Проверка, что tun2socks жив..."
kill -0 "$(cat /tmp/tun2socks.pid)" 2>/dev/null

echo "[6] Проверка IP после маршрутов..."
curl -sS --max-time 8 https://ipinfo.io/ip | tee /tmp/vpn_ip_after.txt >/dev/null
echo "✅ IP после маршрутов: $(cat /tmp/vpn_ip_after.txt)"

echo "✅ VPN запущен!"
echo "Логи:"
echo "  $xray_LOG"
echo "  $TUN_LOG"
echo "  /tmp/xray_error.log (из config.json)"
