import { select } from './select';
import type { Database, DatabaseOptions } from '../types';

/**
 * Creates a database instance with all operations bound to a connection
 * @param connectionString PostgreSQL connection string (e.g., 'postgresql://user:pass@localhost:5432/dbname')
 * @param options Database options including PII masking
 * @returns Database instance with bound operations
 *
 * @example
 * ```typescript
 * const db = createDatabase('postgresql://user:pass@localhost:5432/mydb', {
 *   maskPII: true
 * });
 *
 * const result = await db.select('SELECT * FROM users');
 * if (result.success) {
 *   console.log(result.data.rows);
 * }
 * ```
 */
export function createDatabase(
  connectionString: string,
  options: DatabaseOptions = {}
): Database {
  return {
    select: select(connectionString, options),
  };
}
