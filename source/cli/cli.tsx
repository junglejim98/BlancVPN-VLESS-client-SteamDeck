import React, {useState} from 'react';
import {render, Box, Text} from 'ink';
import SelectInput from 'ink-select-input';
import UrlInput from './configReader.js';
import CountrySelector from './countrySelector.js';
import DownloadV2Ray from './shell.js';
import decoder from '../utils/decoder.js';
import { getShellPath } from '../utils/getSheellPath.js';
import getBetween from '../utils/parser.js';


type Step = 'menu' | 'enterUrl' | 'showList' | 'buildConfig' | 'v2RayDownload' | 'tun2SocksDonload' | 'start-vpn' | 'stop-vpn';
const menuItems = [
	{label: '1. Скачать v2Ray', value: 'v2RayDownload'},
	{label: '2. Скачать tun2Socks', value: 'tun2SocksDonload'},
	{label: '3. Ввести URL', value: 'enterUrl'},
	{label: '4. Показать список', value: 'showList'},
	{label: '5. Создать config.json', value: 'buildConfig'},
	{label: '6. Запустить VPN', value: 'start-vpn'},
	{label: '7. Остановить VPN', value: 'stop-vpn'},
	{label: '0. Выход', value: 'exit'},
];

const App = () => {
	const [step, setStep] = useState<Step>('menu');
	const [utf8, setUtf8] = useState<string | null>(null);
	const [selection, setSelection] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	if (step === 'menu') {
		return (
			<Box flexDirection="column">
				{error && <Text color="red">{error}</Text>}
				<Text>Выберите действие:</Text>
				<SelectInput
					items={menuItems}
					onSelect={item => {
						if (item.value === 'exit') {
							process.exit(0);
						}

						if (item.value === 'v2RayDownload') {
							setError(null);
							setStep('v2RayDownload');
							return;
						}

						if (item.value === 'tun2SocksDonload') {
							setError(null);
							setStep('tun2SocksDonload');
							return;
						}

						if (item.value === 'enterUrl') {
							setError(null);
							setStep('enterUrl');
							return;
						}

						if (item.value === 'showList') {
							if (!utf8) {
								setError('Сначала введите URL (пункт 3)');
								return;
							}
							setError(null);
							setStep('showList');
							return;
						}

						if (item.value === 'buildConfig') {
							if (!selection) {
								setError('Сначала выберите строку (пункт 4)');
								return;
							}
							setError(null);
							setStep('buildConfig');
							return;
						}

						if (item.value === 'start-vpn') {
							if (!selection) {
								setError('Сначала выберите строку (пункт 4)');
								return;
							}
							setError(null);
							setStep('start-vpn');
							return;
						}

						if (item.value === 'stop-vpn') {
							if (!selection) {
								setError('Сначала выберите строку (пункт 4)');
								return;
							}
							setError(null);
							setStep('stop-vpn');
							return;
						}
					}}
				/>
			</Box>
		);
	}

	if (step === 'v2RayDownload') {
		return (
			<DownloadV2Ray
				command={`sh ${getShellPath('v2rayDownload.sh')}`}
				onDone={() => setStep('menu')}
			/>
		);
	}

	if (step === 'tun2SocksDonload') {
		return (
			<DownloadV2Ray
				command={`sh ${getShellPath('tun2SocksDonload.sh')}`}
				onDone={() => setStep('menu')}
			/>
		);
	}

	if (step === 'enterUrl') {
		return (
			<UrlInput
				onSubmit={(data: string) => {
					setUtf8(data);
					setStep('menu');
				}}
			/>
		);
	}

	if (step === 'showList') {
		return (
			<CountrySelector
				url={utf8!}
				onSelect={(val: string) => {
					setSelection(val);
					setStep('menu');
				}}
			/>
		);
	}

	if (step === 'buildConfig') {
		decoder(selection!)
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
		return (
			<DownloadV2Ray
				command={`sh ${getShellPath('start-vpn.sh')}`}
				dnsHost={getBetween(selection!, '@', ':')}
				onDone={() => setStep('menu')}
			/>
		);
	}

		if (step === 'stop-vpn') {
		return (
			<DownloadV2Ray
				command={`sh ${getShellPath('stop-vpn.sh')}`}
				dnsHost={getBetween(selection!, '@', ':')}
				onDone={() => setStep('menu')}
			/>
		);
	}

	return null;
};

render(<App />);
