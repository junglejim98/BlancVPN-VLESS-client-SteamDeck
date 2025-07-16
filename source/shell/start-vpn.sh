VPN_SERVER_IP="185.130.184.58"
GATEWAY=$(ip route | grep default | awk '{print $3}')

echo "[0] Удаление старого tun0 (если был)..."
sudo ip link delete tun0 2>/dev/null

echo "[1] Запуск V2Ray..."
nohup ~/v2ray/v2ray run -config ~/.config/v2ray/config.json </dev/null > /dev/null 2>&1 &
echo $! > /tmp/v2ray.pid
sleep 2

echo "[2] Поднятие интерфейса tun0..."
sudo ip tuntap add dev tun0 mode tun user $(whoami) 2>/dev/null
sudo ip link set tun0 up

echo "[3] Запуск tun2socks..."
nohup ~/tun2socks/tun2socks \
  -device tun://tun0 \
  -proxy socks5://127.0.0.1:1080 \
  -loglevel silent </dev/null > /dev/null 2>&1 &
echo $! > /tmp/tun2socks.pid
sleep 2

echo "[4] Настройка маршрутов..."
sudo ip route add $VPN_SERVER_IP via $GATEWAY
sudo ip route add 0.0.0.0/1 dev tun0
sudo ip route add 128.0.0.0/1 dev tun0

echo "[5] Проверка текущего IP через curl..."
curl -s https://ipinfo.io/ip

echo "✅ VPN запущен!"
