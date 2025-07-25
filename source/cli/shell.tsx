import React, {useEffect, useState} from 'react';
import {Box, Text, useInput} from 'ink';
import {runCommand} from '../utils/shCommandsRunner.js';
import {resolveHostToIP} from '../utils/lookup.js';

interface Props {
	command: string;
	onDone: () => void;
	dnsHost?: string;
}

export default function ScriptRunner({command, onDone, dnsHost}: Props) {
	const [stdout, setStdout] = useState<string>('');
	const [stderr, setStderr] = useState<string>('');
	const [isDone, setIsDone] = useState<boolean>(false);

	useEffect(() => {
		(async () => {
			try {
				let fullCommand = command;

				if (dnsHost) {
					const ip = await resolveHostToIP(dnsHost);
					fullCommand = `VPN_SERVER_IP="${ip}" ${command}`;
					setStdout(prev => `${prev}\n📡 DNS ${dnsHost} → ${ip}`);
				}

				const {stdout, stderr} = await runCommand(fullCommand);
				setStdout(s => s + '\n' + stdout);
				setStderr(stderr);
			} catch (err: any) {
				setStderr(err.message);
			} finally {
				setIsDone(true);
			}
		})();
	}, [command, dnsHost]);

	useInput(() => {
		if (isDone) {
			onDone();
		}
	});

	return (
		<Box flexDirection="column">
			{!isDone && <Text>⏳ Выполняю скрипт…</Text>}
			{stdout && (
				<Box flexDirection="column" marginTop={1}>
					<Text color="green">Вывод:</Text>
					<Text>{stdout.trim()}</Text>
				</Box>
			)}
			{stderr && (
				<Box flexDirection="column" marginTop={1}>
					<Text color="red">Ошибки:</Text>
					<Text>{stderr.trim()}</Text>
				</Box>
			)}
			{isDone && (
				<Text bold color="cyan">
					✅ Готово! Нажмите любую клавишу, чтобы вернуться в меню.
				</Text>
			)}
		</Box>
	);
}
