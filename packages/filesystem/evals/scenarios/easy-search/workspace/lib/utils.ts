import fs from 'fs';
import path from 'path';

export function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}
