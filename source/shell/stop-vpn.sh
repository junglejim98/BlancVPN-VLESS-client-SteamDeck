VPN_SERVER_IP="185.130.184.58"

echo "[1] Удаление маршрутов..."
sudo ip route del 0.0.0.0/1 dev tun0
sudo ip route del 128.0.0.0/1 dev tun0
sudo ip route del $VPN_SERVER_IP

echo "[2] Удаление tun0..."
sudo ip link delete tun0

echo "[3] Завершение процессов..."
kill $(cat /tmp/v2ray.pid) 2>/dev/null
kill $(cat /tmp/tun2socks.pid) 2>/dev/null
rm -f /tmp/v2ray.pid /tmp/tun2socks.pid

echo "❎ VPN остановлен"
