/**
 * Standard result wrapper for all database operations
 */
export interface OperationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Database configuration options
 */
export interface DatabaseOptions {
  /** Enable automatic PII masking in query results */
  maskPII?: boolean;
}

/**
 * Field metadata from query results
 */
export interface FieldInfo {
  name: string;
  dataTypeID: number;
  dataType?: string;
}

/**
 * PII field information
 */
export interface PIIField {
  name: string;
  type: PIIType;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Types of PII that can be detected
 */
export type PIIType =
  | 'email'
  | 'phone'
  | 'ssn'
  | 'credit_card'
  | 'ip_address'
  | 'name'
  | 'address'
  | 'date_of_birth'
  | 'passport'
  | 'drivers_license'
  | 'generic';

/**
 * Result from a SELECT query
 */
export interface QueryResult {
  rows: Record<string, any>[];
  rowCount: number;
  fields: FieldInfo[];
  piiFields?: PIIField[];
}

/**
 * Core database operations bound to a connection
 */
export interface Database {
  /**
   * Execute a SELECT query
   * @param query SQL SELECT query
   * @param params Optional query parameters for parameterized queries
   * @returns Query results with optional PII masking
   */
  select(query: string, params?: any[]): Promise<OperationResult<QueryResult>>;
}

/**
 * Type for the select operation
 */
export type SelectOperation = (
  query: string,
  params?: any[]
) => Promise<OperationResult<QueryResult>>;
