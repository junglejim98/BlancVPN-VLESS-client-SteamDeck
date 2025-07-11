import * as fs from 'node:fs'
import base64UrlDownloader from './downloader.js';

function getBetween(str: string, startSym: string, endSym: string) {
  const start = str.indexOf(startSym);
  if (start === -1) return '';
  const from = start + startSym.length;
  const end = str.indexOf(endSym, from);
  if (end === -1) return '';
  return str.substring(from, end);
}

const rawVless = await base64UrlDownloader('https://46932b5a.withblancvpn.online/s/6351a33ccb384e5bb1895a2b926baaf4')


const tmpVless: string = rawVless.data.split('#')[0]??'';


const confJSON =JSON.stringify({
  "inbounds": [
    {
      "port": 1080,
      "listen": "127.0.0.1",
      "protocol": "socks",
      "settings": {
        "udp": true
      }
    }
  ],
  "outbounds": [
    {
      "protocol": "vless",
      "settings": {
        "vnext": [
          {
            "address": getBetween(tmpVless, '@', ':'),
            "port": 8443,
            "users": [
              {
                "id": getBetween(tmpVless, '//', '@'),
                "encryption": "none"
              }
            ]
          }
        ]
      },
      "streamSettings": {
        "network": "tcp",
        "security": "tls"
      }
    },
    {
      "protocol": "freedom",
      "tag": "direct"
    }
  ],
  "routing": {
    "domainStrategy": "AsIs",
    "rules": [
      {
        "type": "field",
        "domain": ["geosite:geolocation-!cn"],
        "outboundTag": "direct"
      },
      {
        "type": "field",
        "outboundTag": "direct",
        "domain": [getBetween(tmpVless, '//', ':')]
      }
    ]
  }
}, null, 2)

fs.writeFile('config.json', confJSON, (err) => {
  if (err) {
    console.error('Ошибка при записи в файл:', err);
  } else {
    console.log('Данные успешно записаны в файл data.json');
  }
});



