import { exec } from 'child_process';
import { promisify } from 'util';


const execAsync = promisify(exec);

/**
 * Запускает shell-команду и возвращает { stdout, stderr }.
 * @param {string} cmd = 'passwd && sudo steamos-readonly disable'
 * @returns {Promise<{ stdout: string, stderr: string }>}
 */

export async function runCommand(cmd: string) {
  try {
    const { stdout, stderr } = await execAsync(cmd);
    return { stdout, stderr };
  } catch (err) {
    throw err;
  }
}
