import React, {useState} from 'react';
import {Box, Text} from 'ink';
import TextInput from 'ink-text-input';
import base64UrlDownloader from '../utils/downloader.js';
import {writeFile ,appendFile} from 'node:fs/promises';
import fs from 'fs';


interface Props {
	onSubmit: (url: string) => void;
}

export default function UrlInput({onSubmit}: Props) {
	const [input, setInput] = useState('');

	const handleSubmit = async (value: string) => {
		try {
			const {data: utf8} = await base64UrlDownloader(value);

			const vlessURL = {
				VLESS_URL: utf8,
			};
			if(!fs.existsSync('./vlessConfig.json')){
				writeFile('vlessConfig.json', JSON.stringify(vlessURL, null, 2), 'utf-8');
				} else {
				appendFile('vlessConfig.json', JSON.stringify(vlessURL, null, 2), 'utf-8');
				}
			onSubmit(utf8);
		} catch (err: any) {
			console.error('Ошибка при загрузке:', err.message);
			process.exit(1);
		}
	};

	return (
		<Box flexDirection="column">
			<Text>Введите URL конфига:</Text>
			<TextInput value={input} onChange={setInput} onSubmit={handleSubmit} />
		</Box>
	);
}
