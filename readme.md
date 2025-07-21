# BlankVPN-VLESS-Client

**VPN-клиент для Steam Deck** на основе V2Ray (протокол VLESS). Позволяет легко скачивать необходимые утилиты, генерировать конфиг и прокидывать весь трафик через SOCKS5 с помощью tun2socks.

---

## Содержание

- [Что это и зачем](#что-это-и-зачем)  
- [Требования](#требования)  
- [Установка](#установка)  
- [Использование](#использование)  
- [Как это работает](#как-это-работает)  
- [Структура проекта](#структура-проекта)  
- [Примеры](#примеры)   

---

## Что это и зачем

Этот проект — удобный CLI-инструмент для настройки и запуска VPN на Steam Deck через V2Ray/VLESS.  
Вместо ручного скачивания архивов, распаковки и правки конфигов вы получаете меню:

1. Скачать v2Ray  
2. Скачать tun2socks  
3. Ввести URL со списком серверов  
4. Выбрать сервер по стране  
5. Генерировать `config.json`  
6. Запустить VPN  
7. Остановить VPN  

Всё управляется из одной программы, без переключения между терминалами и редакторами.

---

## Требования

- **Steam Deck** (или любая другая Linux-машина)  
- **Node.js** версии 16 и выше  
- Установленные утилиты: `wget`, `unzip`
- Права `sudo` или root-доступ для записи конфигурации и управления интерфейсом  

---

## Установка

1. Клонируйте репозиторий:
   ```bash
   git clone https://github.com/LysenokGA/BlankVPN-VLESS-Client.git
   cd BlankVPN-VLESS-Client
   ```
2. Установите зависимости:
   ```bash
   npm install
   ```
## Использование

Запустите CLI:
```bash
cd ./BlankVPN-VLESS-Client/source
npm run build
node ../dist/cli/cli.js
```

Дальше просто выбираете пункт меню стрелками и Enter.

---

## Как это работает
- CLI на Ink.js
Меню организовано как React-приложение в консоли.

- SH-скрипты в папке scripts/
Отвечают за скачивание (wget), распаковку (unzip) и управление VPN-интерфейсом.

- Утилиты в utils/

	- shCommandsRunner.ts — обёртка над exec для запуска любых shell-команд.

	- decoder.ts — формирует config.json из выбранной строки VLESS.

	- lookup.ts — преобразует доменное имя в IP перед подключением.
 
 	- downloader.ts - скачивает и дешефрует BASE64 строку с конфигами.

  	- getSheellPath.ts - резолвит путь к SH скриптам для правильного копирования в dist и последующего к ним обращения.
  	
   	- parser.ts - набор утилит для работы со строками (*getBetween*, *substringAfter*)  

- Поток работы

	1. Скачивание компонентов v2Ray и tun2socks при необходимости.

  	2. Вводите URL со списком конфигов (BASE64-строки).

	3. configReader.tsx и countrySelector.tsx разбирают и показывают их по странам.

	4. После выбора — decoder записывает готовый ~/.config/v2ray/config.json.

  	6. Скрипты start-vpn.sh/stop-vpn.sh поднимают или опускают интерфейс tun0.

---

## Структура проекта

```bash
.
├── cli.tsx                  # главный Ink-CLI
├── scripts/                 # shell-скрипты
│   ├── v2rayDownload.sh
│   ├── tun2socksDownload.sh
│   ├── start-vpn.sh
│   └── stop-vpn.sh
├── utils/                   # вспомогательные модули
│   ├── shCommandsRunner.ts  # запуск shell-команд
│   ├── decoder.ts           # формирование config.json
│   └── lookup.ts            # DNS → IP
├── configReader.tsx         # ввод и разбор BASE64-списка
├── countrySelector.tsx      # выбор сервера по стране
└── package.json
```

---

## Примеры
	
 - Окно работы программы
  
<img width="198" height="135" alt="Снимок экрана 2025-07-21 в 12 25 39" src="https://github.com/user-attachments/assets/c64cc48d-9b18-4dee-b474-e9707534683c" />
 
 - Списко VLESS конфигов по странам
   
<img width="330" height="172" alt="Снимок экрана 2025-07-21 в 12 26 38" src="https://github.com/user-attachments/assets/f860f59e-d2f6-4b76-afcc-3fb6e438ab62" />

 - Запуск VPN

<img width="367" height="60" alt="Снимок экрана 2025-07-21 в 12 28 37" src="https://github.com/user-attachments/assets/0c9b72b3-c0b3-45f7-96a1-941d6c6ec5f3" />
