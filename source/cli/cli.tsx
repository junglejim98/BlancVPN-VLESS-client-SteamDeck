import React, {useState} from 'react';
import {render, Box, Text} from 'ink';
import SelectInput from 'ink-select-input';
import UrlInput from './configReader.js';
import CountrySelector from './countrySelector.js';
import ScriptRunner from './shell.js';
import decoder from '../utils/decoder.js';
import {getShellPath} from '../utils/getSheellPath.js';
import getBetween, {substringAfter} from '../utils/parser.js';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {readConfig} from '../utils/jsonChecker.js';
import VpnStatus from './connectionTest.js';

type Step =
	| 'menu'
	| 'enterUrl'
	| 'showList'
	| 'buildConfig'
	| 'v2RayDownload'
	| 'tun2SocksDownload'
	| 'start-vpn'
	| 'stop-vpn'
	| 'checkConnection';
const menuItems = [
	{label: '1. Скачать v2Ray', value: 'v2RayDownload'},
	{label: '2. Скачать tun2Socks', value: 'tun2SocksDownload'},
	{label: '3. Ввести URL', value: 'enterUrl'},
	{label: '4. Показать список', value: 'showList'},
	{label: '5. Создать config.json', value: 'buildConfig'},
	{label: '6. Запустить VPN', value: 'start-vpn'},
	{label: '7. Остановить VPN', value: 'stop-vpn'},
	{label: '8. Проверить подключение', value: 'checkConnection'},
	{label: '0. Выход', value: 'exit'},
];

const App = () => {
	const [step, setStep] = useState<Step>('menu');
	const [error, setError] = useState<string | null>(null);
	const configPathV2ray = path.join(os.homedir(), 'v2ray');
	const configPathTun2socks = path.join(os.homedir(), 'tun2socks');
	const config = readConfig();

	if (step === 'menu') {
		let vlessUrlStatus = '⚠️ URL не найден';
		let configStatus = '⚠️ Конфигурация отсутствует';
		let colorURL = 'red';
		let colorVLESS = 'red';

		if (config.VLESS_URL) {
			try {
				if (config.VLESS_URL) {
					vlessUrlStatus = '🌐 VLESS URL указан.';
					colorURL = 'green';
				}
				if (config.VLESS_CONFIG) {
					configStatus =
						'📄 Конфигурация загружена. ' +
						substringAfter(config.VLESS_CONFIG, '#');
					colorVLESS = 'green';
				}
			} catch (e) {
				console.error('Ошибка чтения vlessConfig.json:', e);
			}
		}

		return (
			<Box flexDirection="column">
				{error && <Text color="red">{error}</Text>}
				<Text color={colorURL}>{vlessUrlStatus}</Text>
				<Text color={colorVLESS}>{configStatus}</Text>
				<Text>Выберите действие:</Text>
				<SelectInput
					items={menuItems}
					onSelect={item => {
						if (item.value === 'exit') {
							process.exit(0);
						}

						if (item.value === 'v2RayDownload') {
							if (fs.existsSync(configPathV2ray)) {
								setError('v2ray уже скачан');
								return;
							}
							setError(null);
							setStep('v2RayDownload');
							return;
						}

						if (item.value === 'tun2SocksDownload') {
							if (fs.existsSync(configPathTun2socks)) {
								setError('tun2Socks уже скачан');
								return;
							}
							setError(null);
							setStep('tun2SocksDownload');
							return;
						}

						if (item.value === 'enterUrl') {
							setError(null);
							setStep('enterUrl');
							return;
						}

						if (item.value === 'showList') {
							if (!config.VLESS_URL) {
								setError('Сначала введите URL (пункт 3)');
								return;
							}
							setError(null);
							setStep('showList');
							return;
						}

						if (item.value === 'buildConfig') {
							if (!config.VLESS_CONFIG) {
								setError('Сначала выберите страну (пункт 4)');
								return;
							}
							setError(null);
							setStep('buildConfig');
							return;
						}

						if (item.value === 'start-vpn') {
							if (!config.VLESS_URL) {
								setError('Сначала выберите страну (пункт 4)');
								return;
							}
							setError(null);
							setStep('start-vpn');
							return;
						}

						if (item.value === 'stop-vpn') {
							if (!config.VLESS_URL) {
								setError('Сначала выберите строку (пункт 4)');
								return;
							}
							setError(null);
							setStep('stop-vpn');
							return;
						}

						if (item.value === 'checkConnection') {
							setError(null);
							setStep('checkConnection');
							return;
						}
					}}
				/>
			</Box>
		);
	}

	if (step === 'v2RayDownload') {
		return (
			<ScriptRunner
				command={`sh ${getShellPath('v2rayDownload.sh')}`}
				onDone={() => setStep('menu')}
			/>
		);
	}

	if (step === 'tun2SocksDownload') {
		return (
			<ScriptRunner
				command={`sh ${getShellPath('tun2SocksDownload.sh')}`}
				onDone={() => setStep('menu')}
			/>
		);
	}

	if (step === 'enterUrl') {
		return (
			<UrlInput
				onSubmit={() => {
					setStep('menu');
				}}
			/>
		);
	}

	if (step === 'showList') {
		return (
			<CountrySelector
				url={config.VLESS_URL!}
				onSelect={() => {
					setStep('menu');
				}}
			/>
		);
	}

	if (step === 'buildConfig') {
		decoder(config.VLESS_CONFIG!)
			.then(() => {
				console.log('✅ config.json создан');
				setStep('menu');
			})
			.catch(err => {
				console.error('❌ Ошибка при создании конфига:', err);
				setStep('menu');
			});

		return <Text>Генерирую config.json…</Text>;
	}

	if (step === 'start-vpn') {
		const raw = fs.readFileSync('vlessConfig.json', 'utf-8');
		const DNS = JSON.parse(raw);
		console.log(DNS.VLESS_CONFIG);
		return (
			<ScriptRunner
				command={`sh ${getShellPath('start-vpn.sh')}`}
				dnsHost={getBetween(DNS.VLESS_CONFIG!, '@', ':')}
				onDone={() => setStep('menu')}
			/>
		);
	}

	if (step === 'stop-vpn') {
		const raw = fs.readFileSync('vlessConfig.json', 'utf-8');
		const DNS = JSON.parse(raw);
		return (
			<ScriptRunner
				command={`sh ${getShellPath('stop-vpn.sh')}`}
				dnsHost={getBetween(DNS.VLESS_CONFIG!, '@', ':')}
				onDone={() => setStep('menu')}
			/>
		);
	}

	if (step === 'checkConnection') {
		return (
			<VpnStatus 
			onDone={() => setStep('menu')}
				/>
		);
	}

	return null;
};

render(<App />);
