import {writeFile, mkdir} from 'node:fs/promises';
import path from 'path';
import os from 'os';
import getBetween from './parser.js';

export default async function decoder(stringValue: string) {
	console.log('decoder получил:', stringValue);

	const conf = {
		inbounds: [
			{
				port: 1080,
				listen: '127.0.0.1',
				protocol: 'socks',
				settings: {
					udp: true,
				},
			},
		],
		outbounds: [
			{
				protocol: 'vless',
				settings: {
					vnext: [
						{
							address: getBetween(stringValue, '@', ':'),
							port: 8443,
							users: [
								{
									id: getBetween(stringValue, '//', '@'),
									encryption: 'none',
								},
							],
						},
					],
				},
				streamSettings: {
					network: 'tcp',
					security: 'tls',
				},
			},
			{
				protocol: 'freedom',
				tag: 'direct',
			},
		],
		/*routing: {
			domainStrategy: 'AsIs',
			rules: [
				{
					type: 'field',
					domain: ['geosite:geolocation-!cn'],
					outboundTag: 'direct',
				},
				{
					type: 'field',
					outboundTag: 'direct',
					domain: [getBetween(stringValue, '//', ':')],
				},
			],
		},*/
		log: {
			loglevel: 'warning',
			error: '/tmp/v2ray_error.log',
			access: '/tmp/v2ray_access.log'
		},
	};

	const configDir = path.join(os.homedir(), '.config', 'v2ray');
	const confJSON = JSON.stringify(conf, null, 2);
	const configPath = path.join(os.homedir(), '.config', 'v2ray', 'config.json');

	try {
		await mkdir(configDir, {recursive: true});
		await writeFile(configPath, confJSON, 'utf-8');
		console.log('Данные успешно записаны в файл data.json');
	} catch (err) {
		console.error(err);
	}
}
