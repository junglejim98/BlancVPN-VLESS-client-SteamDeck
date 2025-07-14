import React, {useState} from 'react';
import {render, Text, Box} from 'ink';
import СonfigReader from './configReader.js';
import CountrySelector from './countrySelector.js';
import decoder from './decoder.js';

const App = () => {
	const [utf8, setUtf8] = useState<string | null>(null);
	const [selection, setSelection] = useState<string | null>(null);

	// 1) Сначала спрашиваем URL и сохраняем в utf8
	if (utf8 === null) {
		return <СonfigReader onSubmit={setUtf8} />;
	}

	// 2) Когда у нас есть utf8—текст, показываем селектор
	if (selection === null) {
		return <CountrySelector url={utf8} onSelect={setSelection} />;
	}

	// 3) Как только пользователь выбрал строку — запускаем decoder
	//    *Это уже не Ink-фрагмент*, поэтому console.log всё выведет и файл запишется нормально.
	decoder(selection)
		.then(() => {
			console.log('✅ Конфиг записан в config.json');
			process.exit(0);
		})
		.catch(err => {
			console.error('❌ Ошибка при decoder:', err);
			process.exit(1);
		});

	// Пока decoder работает — показываем простой текст
	return (
		<Box>
			<Text>Генерирую config.json…</Text>
		</Box>
	);
};

render(<App />);
