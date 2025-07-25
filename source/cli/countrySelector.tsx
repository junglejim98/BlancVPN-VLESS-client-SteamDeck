import React, {useState, useEffect} from 'react';
import {Box, Text} from 'ink';
import SelectInput from 'ink-select-input';
import {substringAfter} from '../utils/parser.js';
import updateConfigField from '../utils/jsonChecker.js';

interface Props {
	url: string;
	onSelect: () => void;
}

type SelectItem = {label: string; value: string};

export default function CountrySelector({url, onSelect}: Props) {
	const [items, setItems] = useState<SelectItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [created, setCreation] = useState(false);

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
		updateConfigField('VLESS_CONFIG', DNS);
		setCreation(true);
		setTimeout(() => {
			onSelect();
		}, 1000);
	};

	if (created) {
		return <Text color="green"> ✅ Страна выбрана</Text>;
	}

	if (loading) {
		return <Text>Загружаю и готовлю список…</Text>;
	}

	return (
		<Box flexDirection="column">
			<Text>Выберите строку:</Text>
			<SelectInput items={items} onSelect={_onSelect} />
		</Box>
	);
}
