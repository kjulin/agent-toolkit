# @agent-toolkit/logging

Logging toolkit for reading Cloud Run logs using the Google Cloud Logging TypeScript SDK.

## Installation

```bash
npm install @agent-toolkit/logging
```

## Prerequisites

- Google Cloud credentials configured (via `GOOGLE_APPLICATION_CREDENTIALS` environment variable or `gcloud auth application-default login`)
- Required IAM permissions to read logs from Cloud Run services (e.g., `roles/logging.viewer`)

## Usage

```typescript
import { readLogs } from '@agent-toolkit/logging';

// Read recent logs from a Cloud Run service
const result = await readLogs({
  service: 'my-service',
  limit: 50,
});

if (result.success) {
  console.log(`Found ${result.data.count} log entries`);
  result.data.entries.forEach(entry => {
    console.log(`[${entry.severity}] ${entry.timestamp}: ${entry.message}`);
  });
} else {
  console.error(`Error: ${result.error}`);
}
```

## API

### `readLogs(options: ReadLogsOptions)`

Reads logs from a Cloud Run service using the Google Cloud Logging SDK.

#### Options

- `service` (required): Cloud Run service name
- `project` (optional): GCP project ID (uses gcloud default if not provided)
- `region` (optional): Region where the service is deployed
- `severity` (optional): Filter by severity level (ERROR, WARNING, INFO, DEBUG)
- `startTime` (optional): Start time for log entries (ISO 8601 or relative like "1h" for 1 hour ago)
- `endTime` (optional): End time for log entries (ISO 8601 or relative)
- `limit` (optional): Maximum number of log entries to return (default: 100)
- `filter` (optional): Additional filter string in Cloud Logging filter syntax
- `order` (optional): Sort order: "asc" or "desc" (default: "desc")

#### Returns

`Promise<OperationResult<ReadLogsResult>>`

The result contains:
- `success`: Boolean indicating if the operation was successful
- `data`: Contains `entries` (array of log entries), `count`, `service`, and optionally `project`
- `error`: Error message if the operation failed

## Examples

### Filter by severity

```typescript
const result = await readLogs({
  service: 'my-service',
  severity: 'ERROR',
  limit: 20,
});
```

### Filter by time range

```typescript
const result = await readLogs({
  service: 'my-service',
  startTime: '2024-01-01T00:00:00Z',
  endTime: '2024-01-02T00:00:00Z',
});
```

### Filter by region

```typescript
const result = await readLogs({
  service: 'my-service',
  region: 'us-central1',
});
```

### Custom filter

```typescript
const result = await readLogs({
  service: 'my-service',
  filter: 'labels.user_id="123"',
});
```

### Specify project

```typescript
const result = await readLogs({
  service: 'my-service',
  project: 'my-gcp-project',
});
```

## Log Entry Format

Each log entry contains:

```typescript
{
  timestamp: string;          // ISO 8601 timestamp
  severity: string;           // Log severity (ERROR, WARNING, INFO, etc.)
  message: string;            // Log message
  resource?: {                // Resource information
    type: string;
    labels?: Record<string, string>;
  };
  labels?: Record<string, string>;  // Log labels
  jsonPayload?: Record<string, any>; // JSON payload if available
  textPayload?: string;        // Text payload if available
}
```

## Error Handling

The function returns detailed error messages for common issues:

- `Not authenticated with Google Cloud`: Run `gcloud auth application-default login`
- `Permission denied`: Ensure you have the "Logs Viewer" role or equivalent permissions
- `Service or project not found`: Verify the project ID and service name
- `Invalid filter or arguments`: Check your filter syntax
- `Service name is required`: Provide a valid service name

## License

MIT
