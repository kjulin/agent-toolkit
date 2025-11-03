import { Pool } from 'pg';
import type {
  OperationResult,
  QueryResult,
  DatabaseOptions,
  FieldInfo,
} from '../types';

/**
 * Validates that a query is a SELECT query
 */
function isSelectQuery(query: string): boolean {
  const trimmed = query.trim().toLowerCase();
  return trimmed.startsWith('select') || trimmed.startsWith('with');
}

/**
 * Creates a select operation bound to a database connection
 * @param connectionString PostgreSQL connection string
 * @param options Database options including PII masking
 * @returns Select operation function
 */
export const select = (
  connectionString: string,
  options: DatabaseOptions = {}
) => {
  const pool = new Pool({ connectionString });

  return async (
    query: string,
    params?: any[]
  ): Promise<OperationResult<QueryResult>> => {
    try {
      // Validate query is SELECT only
      if (!isSelectQuery(query)) {
        return {
          success: false,
          error: 'Only SELECT queries are allowed. Use SELECT or WITH statements.',
        };
      }

      // Execute query
      const result = await pool.query(query, params);

      // Extract field information
      const fields: FieldInfo[] = result.fields.map((field) => ({
        name: field.name,
        dataTypeID: field.dataTypeID,
      }));

      // Build result (PII masking will be added later)
      const queryResult: QueryResult = {
        rows: result.rows,
        rowCount: result.rowCount || 0,
        fields,
      };

      return {
        success: true,
        data: queryResult,
      };
    } catch (error) {
      // Handle PostgreSQL errors
      if (error instanceof Error) {
        return {
          success: false,
          error: error.message,
        };
      }
      return {
        success: false,
        error: String(error),
      };
    }
  };
};

/**
 * Cleanup function to close database connections
 * Should be called when done using the database
 */
export const closePool = async (pool: Pool): Promise<void> => {
  await pool.end();
};
