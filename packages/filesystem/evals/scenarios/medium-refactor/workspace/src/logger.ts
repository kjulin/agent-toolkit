// This file already uses proper logger - should NOT be modified
import { Logger } from './types';

export const logger: Logger = {
  info: (message: string, ...args: any[]) => {
    console.log(`[INFO] ${message}`, ...args);
  },
  error: (message: string, ...args: any[]) => {
    console.error(`[ERROR] ${message}`, ...args);
  },
  debug: (message: string, ...args: any[]) => {
    console.debug(`[DEBUG] ${message}`, ...args);
  }
};
