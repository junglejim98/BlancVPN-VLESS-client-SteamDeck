import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { exec } from 'child_process';
import util from 'util';
import { Resolver } from 'dns/promises';
import fetch from 'node-fetch';

const execAsync = util.promisify(exec);

interface Props {
	onDone: () => void;
}

export default function VpnStatus({onDone}: Props) {
 const [status, setStatus] = useState<'checking' | 'ok' | 'fail' | 'partial'>('checking');
 const [ip, setIp] = useState<string | null | undefined>(null);
 const [country, setCountry] = useState<string | null>(null);
 const [error, setError] = useState<string | null>(null);
 const [isDone, setIsDone] = useState<boolean>(false);
 

 useEffect(() => {
  (async () => {
   try {
    // 1. Проверка tun0
    const link = await execAsync(`ip link show tun0`);
    if (!link.stdout.includes('state UP')) {
     setError('Интерфейс tun0 не поднят');
     setStatus('fail');
     return;
    }

    // 2. Проверка маршрутов
    const route = await execAsync(`ip route`);
    if (!route.stdout.includes('default') || !route.stdout.includes('tun0')) {
     setError('Маршрут по умолчанию не через tun0');
     setStatus('fail');
     return;
    }

    // 3. DNS-запрос через DNS-сервер из VPN
    const resolver = new Resolver();
    resolver.setServers(['1.1.1.1']); // ← используй DNS из VLESS-конфига

    const addresses = await resolver.resolve4('myip.opendns.com');
    const currentIp = addresses[0];
    setIp(currentIp);

    // 4. GeoIP
    const geoRes = await fetch(`http://ip-api.com/json/${currentIp}?lang=ru`);
    const geo = await geoRes.json() as any;

    if (geo.status === 'success') {
     setCountry(geo.country);
     setStatus('ok');
    } else {
     setStatus('partial');
    }
   } catch (err: any) {
    setError(err.message);
    setStatus('fail');
   }
  })();

  setIsDone(true);
 }, []);

 let output;

 if (status === 'checking') {
  output = <Text color="yellow">🔄 Проверка VPN соединения...</Text>;
 } else if (status === 'ok') {
  output = <Text color="green">✅ VPN подключён: {country} ({ip})</Text>;
 } else if (status === 'partial') {
  output = <Text color="cyan">⚠️ IP: {ip}, но страну определить не удалось</Text>;
 } else {
  output = <Text color="red">❌ VPN не работает: {error}</Text>;
 }

 useInput(() => {
        if (isDone) {
            onDone();
        }
    });

 return (<Box flexDirection="column">
        {output}
        <Text bold color="cyan">
            Нажмите любую клавишу, чтобы вернуться в меню.
        </Text>
        </Box>);
}