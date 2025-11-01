import { promises as fs } from 'fs';
import * as path from 'path';

export async function readConfig() {
  const data = await fs.readFile('config.json', 'utf-8');
  return JSON.parse(data);
}
