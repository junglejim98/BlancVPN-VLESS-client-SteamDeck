import {fileURLToPath} from 'url';
import {dirname, resolve} from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function getShellPath(file: string) {
  return resolve(__dirname, '..', 'shell', file);
}