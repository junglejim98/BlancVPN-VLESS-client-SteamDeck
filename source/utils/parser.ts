export default function getBetween(
	str: string,
	startSym: string,
	endSym: string,
) {
	const start = str.indexOf(startSym);
	if (start === -1) return '';
	const from = start + startSym.length;
	const end = str.indexOf(endSym, from);
	if (end === -1) return '';
	return str.substring(from, end);
}

export function substringAfter(str: string, char: string) {
	const index = str.indexOf(char);
	if (index === -1) {
		return '';
	}
	return str.substring(index + 1);
}
