import { User } from './types';

export function authenticateUser(username: string, password: string): User | null {
  console.log('Authenticating user:', username);

  if (!username || !password) {
    console.log('Missing credentials');
    return null;
  }

  // TODO: Implement actual authentication
  console.log('Authentication successful');
  return { id: '1', username };
}
