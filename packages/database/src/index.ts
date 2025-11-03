/**
 * @agent-toolkit/database
 *
 * PostgreSQL database tools for AI agents with schema exploration and PII masking.
 */

// Core API
export { createDatabase } from './core/index';

// Types
export type {
  Database,
  DatabaseOptions,
  OperationResult,
  QueryResult,
  FieldInfo,
  PIIField,
  PIIType,
  SelectOperation,
} from './types';
