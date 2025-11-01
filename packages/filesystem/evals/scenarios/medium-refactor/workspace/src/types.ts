export interface User {
  id: string;
  username: string;
}

export interface Logger {
  info(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
}
