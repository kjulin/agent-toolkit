import * as fs from 'fs/promises';

export async function writeLog(message: string) {
  await fs.appendFile('log.txt', message + '\n');
}
