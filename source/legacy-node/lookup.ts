import {lookup} from 'dns/promises';

export async function resolveHostToIP(hostname: string): Promise<string> {
	const result = await lookup(hostname);
	return result.address;
}
