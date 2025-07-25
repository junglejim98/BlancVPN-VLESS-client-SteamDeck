import React, {useState} from 'react';
import {Box, Text} from 'ink';
import TextInput from 'ink-text-input';
import base64UrlDownloader from '../utils/downloader.js';
import updateConfigField from '../utils/jsonChecker.js';

interface Props {
	onSubmit: () => void;
}

export default function UrlInput({onSubmit}: Props) {
	const [input, setInput] = useState('');

	const handleSubmit = async (value: string) => {
		try {
			const {data: utf8} = await base64UrlDownloader(value);
			updateConfigField('VLESS_URL', utf8);
			onSubmit();
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
