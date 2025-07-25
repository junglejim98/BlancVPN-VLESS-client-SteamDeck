import fs from 'fs';
import path from 'path';

type Config = {
	VLESS_URL?: string;
	VLESS_CONFIG?: string;
};

const CONFIG_PATH = path.resolve('./vlessConfig.json');

export default function updateConfigField(
	field: 'VLESS_URL' | 'VLESS_CONFIG',
	value: string,
) {
	let config: Record<string, any> = {};

	if (fs.existsSync(CONFIG_PATH)) {
		const rawData = fs.readFileSync(CONFIG_PATH, 'utf-8');
		try {
			config = JSON.parse(rawData);
		} catch (err) {
			console.error('Ошибка парсинга JSON. Файл будет перезаписан.');
			config = {};
		}
	}

	config[field] = value;

	fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
	console.log(`Поле ${field} обновлено.`);
}

export function readConfig(): Config {
	if (!fs.existsSync(CONFIG_PATH)) {
		return {};
	}

	try {
		const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
		return JSON.parse(raw);
	} catch (err) {
		console.error('Ошибка чтения или парсинга config.json:', err);
		return {};
	}
}
