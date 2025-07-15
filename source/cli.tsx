import React, {useState} from 'react';
import {render, Box, Text} from 'ink';
import SelectInput from 'ink-select-input';
import UrlInput from './configReader.js';
import CountrySelector from './countrySelector.js';
import decoder from './decoder.js';

type Step = 'menu' | 'enterUrl' | 'showList' | 'buildConfig';
const menuItems = [
	{label: '1. Ввести URL', value: 'enterUrl'},
	{label: '2. Показать список', value: 'showList'},
	{label: '3. Создать config.json', value: 'buildConfig'},
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

						if (item.value === 'enterUrl') {
							setError(null);
							setStep('enterUrl');
							return;
						}

						if (item.value === 'showList') {
							if (!utf8) {
								setError('Сначала введите URL (пункт 1)');
								return;
							}
							setError(null);
							setStep('showList');
							return;
						}

						if (item.value === 'buildConfig') {
							if (!selection) {
								setError('Сначала выберите строку (пункт 2)');
								return;
							}
							setError(null);
							setStep('buildConfig');
							return;
						}
					}}
				/>
			</Box>
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

	return null;
};

render(<App />);
