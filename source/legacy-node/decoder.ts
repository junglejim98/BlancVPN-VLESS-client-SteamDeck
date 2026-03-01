import {writeFile, mkdir} from 'node:fs/promises';
import path from 'path';
import os from 'os';

export default async function decoder(vlessUri: string) {
  const u = new URL(vlessUri.trim()); // vless://uuid@host:port?...#name

  const uuid = u.username;
  const address = u.hostname;
  const port = u.port ? Number(u.port) : 443;

  const security = u.searchParams.get('security') ?? 'tls'; // tls / reality / none
  const type = u.searchParams.get('type') ?? 'tcp';         // tcp/ws/grpc
  const sni = u.searchParams.get('sni') ?? address;

  const flow = u.searchParams.get('flow') ?? undefined;     // xtls-rprx-vision
  const fp = u.searchParams.get('fp') ?? 'chrome';
  const pbk = u.searchParams.get('pbk') ?? '';
  const sid = u.searchParams.get('sid') ?? '';

  const streamSettings: any = {
    network: type,
    security: security === 'none' ? 'none' : security,
  };

  if (security === 'tls') {
    streamSettings.tlsSettings = {serverName: sni};
  }

  if (security === 'reality') {
    streamSettings.realitySettings = {
      serverName: sni,
      fingerprint: fp,
      publicKey: pbk,
      shortId: sid,
    };
  }

  const conf: any = {
    log: {
      loglevel: 'warning',
      error: '/tmp/xray_error.log',
      access: '/tmp/xray_access.log',
    },
    inbounds: [
      {
        port: 1080,
        listen: '127.0.0.1',
        protocol: 'socks',
        settings: {udp: true},
      },
    ],
    outbounds: [
      {
        protocol: 'vless',
        settings: {
          vnext: [
            {
              address,
              port,
              users: [
                {
                  id: uuid,
                  encryption: 'none',
                  ...(flow ? {flow} : {}),
                },
              ],
            },
          ],
        },
        streamSettings,
      },
      {protocol: 'freedom', tag: 'direct'},
    ],
  };


  const configDir = path.join(os.homedir(), '.config', 'xray');
  const configPath = path.join(configDir, 'config.json');

  await mkdir(configDir, {recursive: true});
  await writeFile(configPath, JSON.stringify(conf, null, 2), 'utf-8');
}
