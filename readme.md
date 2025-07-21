# BlankVPN-VLESS-Client
VPN клиент для Steam Deck на базе V2Ray через протокол VLESS.

***
## Описание работы клиента
Работа клиента осуществляется через локальный **SOCKS5-сервер**. Трафик шифруется и отпрвляется на выбранный удаленный **VLESS** сервер. 
Для того, чтобы шифровался весь системный трафик используется виртуальный интерфейс tun0 через **tun2socks**.

***
## Описание структуры проекта

Проект разбит на CLI обработчики, SH скрипты и вспомогательные утилиты.

### CLI обработчик работает на базе React INK.JS. 

Вся логика работы клиента собрана в cli.tsx, фактически это хаб проекта. Работа производится через логику меню:
```tsx
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
```
Скачивание **v2ray** и **tun2socks** производится с помощью *wget* и распаковка с помощью *unzip*. 

>Обе утилиты кладутся в корень системы, если есть небходимость в изменении пути - нужно править sh-скрипты и указывать кастомный путь.

### Список VLESS конфигов скачивается в формате BASE64 и дешифруется с помощью **configReader.tsx**

Обработка конфига производится с помощью утилиты *base64UrlDownloader*, в файле **downloader.ts**

```ts
import {Buffer} from 'buffer';

export default async function base64UrlDownloader(url: string) {
	const res = await fetch(url);
	if (!res.ok) throw new Error(`Ошибка {res.statis}`);
	const b64 = await res.text();

	const buf = Buffer.from(b64, 'base64');
	const utf8 = buf.toString('utf-8');

	return {data: utf8};
}
```

### Формирование конфига производится после выбора VLESS сервера по доступным странам. 
Список конфигов формируется в **countrySelector.tsx**. И через Props, выбранный конфиг отправляется в **cli.tsx**

```tsx
...
	useEffect(() => {
		(async () => {
			const list = url
				.split('\n')
				.map(s => s.trim())
				.filter(s => s !== '');

			setItems(
				list.map(str => ({label: substringAfter(str, '#'), value: str})),
			);
			setLoading(false);
		})();
	}, [url]);
	const _onSelect = async (item: SelectItem) => {
		const DNS: string = item.value;
		onSelect(DNS);
	};
...
```

Формирование конфига производится с помощью утилиты *decoder* в **cli.tsx**. Конфиг сразу кладется в нужное место в системе SteamOS.

```ts
...
const confJSON = JSON.stringify(conf, null, 2);

	try {
		await writeFile('~/.config/v2ray/config.json', confJSON, 'utf-8');
		console.log('Данные успешно записаны в файл data.json');
	} catch (err) {
		console.error(err);
	}
```
### Все sh-скрипты запускаются с помощью компонента **shell.tsx** и утилиты *shCommandRunner.ts*

Компонент универсальный с одним необязательным Props для который определяет включается запуск/остановка VPN или скачивание утилит.

```ts
...
import { getShellPath } from '../utils/getSheellPath.js';
...
		if (step === 'start-vpn') {
		return (
			<DownloadV2Ray
				command={`sh ${getShellPath('start-vpn.sh')}`}
				dnsHost={getBetween(selection!, '@', ':')}
				onDone={() => setStep('menu')}
			/>
		);
	}
...
```

```tsx
...
import {resolveHostToIP} from '../utils/lookup.js';

interface Props {
  command: string;
  onDone: () => void;
  dnsHost?: string;
}
...
        if (dnsHost) {
          const ip = await resolveHostToIP(dnsHost);
          fullCommand = `VPN_SERVER_IP="${ip}" ${command}`;
          setStdout(prev => `${prev}\n📡 DNS ${dnsHost} → ${ip}`);
        }
...
```

***
Автор: LysenokGA · VLESS-client Steam Deck
