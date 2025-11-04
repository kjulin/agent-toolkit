/**
 * Result wrapper for all logging operations
 */
export interface OperationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Log entry from Cloud Run
 */
export interface LogEntry {
  timestamp: string;
  severity: string;
  message: string;
  resource?: {
    type: string;
    labels?: Record<string, string>;
  };
  labels?: Record<string, string>;
  jsonPayload?: Record<string, any>;
  textPayload?: string;
}

/**
 * Options for reading logs
 */
export interface ReadLogsOptions {
  /** Cloud Run service name */
  service: string;
  /** GCP project ID (optional, uses gcloud default if not provided) */
  project?: string;
  /** Region where the service is deployed (optional) */
  region?: string;
  /** Filter by severity level (e.g., ERROR, WARNING, INFO, DEBUG) */
  severity?: string;
  /** Start time for log entries (ISO 8601 or relative like "1h" for 1 hour ago) */
  startTime?: string;
  /** End time for log entries (ISO 8601 or relative) */
  endTime?: string;
  /** Maximum number of log entries to return (default: 100) */
  limit?: number;
  /** Additional filter string in Cloud Logging filter syntax */
  filter?: string;
  /** Sort order: "asc" or "desc" (default: "desc") */
  order?: 'asc' | 'desc';
}

/**
 * Result from reading logs
 */
export interface ReadLogsResult {
  entries: LogEntry[];
  count: number;
  service: string;
  project?: string;
}

/**
 * Type for the read_logs operation
 */
export type ReadLogsOperation = (
  options: ReadLogsOptions
) => Promise<OperationResult<ReadLogsResult>>;
