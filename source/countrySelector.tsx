import React, {useState, useEffect} from 'react';
import {Box, Text} from 'ink';
import SelectInput from 'ink-select-input';

interface Props {
	url: string;
	onSelect: (value: string) => void;
}

type SelectItem = {label: string; value: string};

export default function CountrySelector({url, onSelect}: Props) {
	const [items, setItems] = useState<SelectItem[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		(async () => {
			const list = url
				.split('\n')
				.map(s => s.trim())
				.filter(s => s !== '');

			setItems(list.map(str => ({label: str, value: str})));
			setLoading(false);
		})();
	}, [url]);
	const _onSelect = async (item: SelectItem) => {
		onSelect(item.value); // только теперь можно выходить
	};

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
