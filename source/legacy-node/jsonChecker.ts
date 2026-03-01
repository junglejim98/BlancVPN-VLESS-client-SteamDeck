import fs from 'fs';
import path from 'path';
import os from 'os';

type Config = {
	VLESS_URL?: string;
	VLESS_CONFIG?: string;
};

const CONFIG_DIR = path.join(os.homedir(), '.config', 'blancvpn');
const CONFIG_PATH = path.join(CONFIG_DIR, 'vlessConfig.json');

function ensureDir() {
  if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });
}

export default function updateConfigField(
	field: 'VLESS_URL' | 'VLESS_CONFIG',
	value: string,
) {

	ensureDir();

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
	ensureDir();
	
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
