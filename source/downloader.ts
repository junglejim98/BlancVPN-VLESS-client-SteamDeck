import { Buffer } from 'buffer'

export default async function base64UrlDownloader(url: string){
    const res = await fetch(url)
    if (!res.ok) throw new Error (`Ошибка {res.statis}`);
    const b64 = await res.text();
    
    const buf = Buffer.from(b64, 'base64');
    const utf8 = buf.toString('utf-8');

    return { data: utf8 };
}