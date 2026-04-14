export default async function base64UrlDownloader(url: string) {
	const res = await fetch(url);
	if (!res.ok) throw new Error(`Ошибка ${res.status}`);
	const b64 = await res.text();

	const binary = atob(b64);
	const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const utf8 = new TextDecoder("utf-8").decode(bytes);

	return {data: utf8};
}
