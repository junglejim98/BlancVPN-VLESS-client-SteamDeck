import { exec } from 'child_process';
import { promisify } from 'util';


const execAsync = promisify(exec);

export async function runCommand(cmd: string) {
  try {
    const { stdout, stderr } = await execAsync(cmd);
    return { stdout, stderr };
  } catch (err) {
    throw err;
  }
}
