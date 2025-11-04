import { Logging } from '@google-cloud/logging';
import type { OperationResult, ReadLogsOptions, ReadLogsResult, LogEntry } from '../types';

/**
 * Builds a Cloud Logging filter for Cloud Run service
 */
function buildFilter(options: ReadLogsOptions): string {
  const filters: string[] = [];

  // Filter for Cloud Run service
  filters.push(`resource.type="cloud_run_revision"`);
  filters.push(`resource.labels.service_name="${options.service}"`);

  // Add region filter if specified
  if (options.region) {
    filters.push(`resource.labels.location="${options.region}"`);
  }

  // Add severity filter if specified
  if (options.severity) {
    filters.push(`severity>=${options.severity.toUpperCase()}`);
  }

  // Add time range filters
  if (options.startTime) {
    filters.push(`timestamp>="${options.startTime}"`);
  }

  if (options.endTime) {
    filters.push(`timestamp<="${options.endTime}"`);
  }

  // Add custom filter if specified
  if (options.filter) {
    filters.push(`(${options.filter})`);
  }

  return filters.join(' AND ');
}

/**
 * Converts a Cloud Logging entry to our LogEntry format
 */
function convertLogEntry(entry: any): LogEntry {
  const metadata = entry.metadata || {};
  const data = entry.data;

  // Extract message from various payload types
  let message = '';
  if (typeof data === 'string') {
    message = data;
  } else if (data && typeof data === 'object') {
    if (data.message) {
      message = data.message;
    } else if (data.textPayload) {
      message = data.textPayload;
    } else if (data.jsonPayload && data.jsonPayload.message) {
      message = data.jsonPayload.message;
    } else if (data.jsonPayload) {
      message = JSON.stringify(data.jsonPayload);
    } else {
      message = JSON.stringify(data);
    }
  }

  return {
    timestamp: metadata.timestamp || metadata.receiveTimestamp || '',
    severity: metadata.severity || 'DEFAULT',
    message,
    resource: metadata.resource,
    labels: metadata.labels,
    jsonPayload: data && typeof data === 'object' ? data.jsonPayload : undefined,
    textPayload: data && typeof data === 'object' ? data.textPayload : (typeof data === 'string' ? data : undefined),
  };
}

/**
 * Reads logs from a Cloud Run service using Google Cloud Logging SDK
 * @param options Options for reading logs
 * @returns Operation result with log entries
 */
export async function readLogs(
  options: ReadLogsOptions
): Promise<OperationResult<ReadLogsResult>> {
  try {
    // Validate required options
    if (!options.service) {
      return {
        success: false,
        error: 'Service name is required',
      };
    }

    // Create Logging client
    const logging = new Logging({
      projectId: options.project,
    });

    // Build filter
    const filter = buildFilter(options);

    // Prepare options for getEntries
    const getEntriesOptions: any = {
      filter,
      pageSize: options.limit || 100,
      orderBy: options.order === 'asc' ? 'timestamp asc' : 'timestamp desc',
    };

    // Fetch log entries
    let entries: any[];
    try {
      const [logEntries] = await logging.getEntries(getEntriesOptions);
      entries = logEntries;
    } catch (apiError: any) {
      // Handle common Google Cloud API errors
      const errorMessage = apiError.message || 'Unknown error';

      if (apiError.code === 16 || errorMessage.includes('UNAUTHENTICATED')) {
        return {
          success: false,
          error: 'Not authenticated with Google Cloud. Run: gcloud auth application-default login',
        };
      }

      if (apiError.code === 7 || errorMessage.includes('PERMISSION_DENIED')) {
        return {
          success: false,
          error: `Permission denied. Ensure you have the "Logs Viewer" role: ${errorMessage}`,
        };
      }

      if (apiError.code === 5 || errorMessage.includes('NOT_FOUND')) {
        return {
          success: false,
          error: `Service or project not found: ${errorMessage}`,
        };
      }

      if (apiError.code === 3 || errorMessage.includes('INVALID_ARGUMENT')) {
        return {
          success: false,
          error: `Invalid filter or arguments: ${errorMessage}`,
        };
      }

      return {
        success: false,
        error: `Failed to read logs: ${errorMessage}`,
      };
    }

    // Convert log entries to our format
    const convertedEntries = entries.map(convertLogEntry);

    return {
      success: true,
      data: {
        entries: convertedEntries,
        count: convertedEntries.length,
        service: options.service,
        project: options.project,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
