set -euo pipefail

SOCKS_PORT="${SOCKS_PORT:-1080}"
VPN_SERVER_IP="${VPN_SERVER_IP:?VPN_SERVER_IP is required}"

V2RAY_BIN="$HOME/v2ray/v2ray"
V2RAY_CFG="$HOME/.config/v2ray/config.json"
TUN2SOCKS_BIN="$HOME/tun2socks/tun2socks"

V2RAY_LOG="/tmp/v2ray.log"
TUN_LOG="/tmp/tun2socks.log"

cleanup() {
  echo "[!] Ошибка — откат (stop-vpn.sh)..."
  bash "$(dirname "$0")/stop-vpn.sh" || true
}
trap cleanup ERR INT TERM

GATEWAY=$(ip route | awk '/default/ {print $3; exit}')
IFACE=$(ip route | awk '/default/ {print $5; exit}')

echo "[0] Удаление старого tun0 (если был)..."
sudo ip link delete tun0 2>/dev/null || true

echo "[1] Запуск V2Ray..."
nohup "$V2RAY_BIN" run -config "$V2RAY_CFG" >> "$V2RAY_LOG" 2>&1 &
echo $! > /tmp/v2ray.pid
sleep 1

echo "[1.1] Проверка SOCKS (до маршрутов)..."
curl -sS --max-time 6 --socks5-hostname "127.0.0.1:${SOCKS_PORT}" https://ipinfo.io/ip \
  | tee /tmp/vpn_ip_socks.txt >/dev/null
echo "✅ SOCKS OK, IP: $(cat /tmp/vpn_ip_socks.txt)"

echo "[2] Поднятие tun0..."
sudo ip tuntap add dev tun0 mode tun user "$(whoami)" 2>/dev/null || true
sudo ip link set tun0 up

echo "[3] Запуск tun2socks..."
nohup "$TUN2SOCKS_BIN" \
  -device tun://tun0 \
  -proxy "socks5://127.0.0.1:${SOCKS_PORT}" \
  -loglevel info >> "$TUN_LOG" 2>&1 &
echo $! > /tmp/tun2socks.pid
sleep 1

echo "[3.1] Проверка, что tun2socks жив..."
kill -0 "$(cat /tmp/tun2socks.pid)" 2>/dev/null

echo "[4] Маршрут до VPN сервера — мимо tun0..."
sudo ip route replace "${VPN_SERVER_IP}/32" via "$GATEWAY" dev "$IFACE"

echo "[5] Перевод дефолтного трафика в tun0..."
sudo ip route replace 0.0.0.0/1 dev tun0
sudo ip route replace 128.0.0.0/1 dev tun0

echo "[6] Проверка IP после маршрутов..."
curl -sS --max-time 8 https://ipinfo.io/ip | tee /tmp/vpn_ip_after.txt >/dev/null
echo "✅ IP после маршрутов: $(cat /tmp/vpn_ip_after.txt)"

echo "✅ VPN запущен!"
echo "Логи:"
echo "  $V2RAY_LOG"
echo "  $TUN_LOG"
echo "  /tmp/v2ray_error.log (из config.json)"
