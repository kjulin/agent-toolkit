# @agent-toolkit/logs

Log reading toolkit for Cloud Run logs using the Google Cloud Logging TypeScript SDK.

## Installation

```bash
npm install @agent-toolkit/logs
```

## Prerequisites

- Google Cloud credentials configured (via `GOOGLE_APPLICATION_CREDENTIALS` environment variable or `gcloud auth application-default login`)
- Required IAM permissions to read logs from Cloud Run services (e.g., `roles/logging.viewer`)

## Usage

### Curried Pattern (Recommended)

Configure service settings once, then call with different filters:

```typescript
import { createReadLogs } from '@agent-toolkit/logs';

// Configure once for your service
const readMyServiceLogs = createReadLogs({
  service: 'my-service',
  project: 'my-project',    // optional
  region: 'us-central1',    // optional
});

// Call multiple times with different filters
const recentErrors = await readMyServiceLogs({
  severity: 'ERROR',
  limit: 50,
});

const lastHourLogs = await readMyServiceLogs({
  startTime: '1h',
  limit: 100,
});

if (recentErrors.success) {
  console.log(`Found ${recentErrors.data.count} errors`);
  recentErrors.data.entries.forEach(entry => {
    console.log(`[${entry.severity}] ${entry.timestamp}: ${entry.message}`);
  });
} else {
  console.error(`Error: ${recentErrors.error}`);
}
```

### Direct Usage (Backward Compatible)

Pass all options at once:

```typescript
import { readLogs } from '@agent-toolkit/logs';

const result = await readLogs({
  service: 'my-service',
  project: 'my-project',
  severity: 'ERROR',
  limit: 50,
});
```

## API

### `createReadLogs(config: ServiceConfig)`

Creates a curried function for reading logs from a specific service. This is the recommended approach as it separates service configuration from filter options.

#### Service Configuration

- `service` (required): Cloud Run service name
- `project` (optional): GCP project ID (uses gcloud default if not provided)
- `region` (optional): Region where the service is deployed

#### Returns

A function that accepts `LogFilterOptions` and returns `Promise<OperationResult<ReadLogsResult>>`

#### Filter Options

- `severity` (optional): Filter by severity level (ERROR, WARNING, INFO, DEBUG)
- `startTime` (optional): Start time for log entries (ISO 8601 or relative like "1h" for 1 hour ago)
- `endTime` (optional): End time for log entries (ISO 8601 or relative)
- `limit` (optional): Maximum number of log entries to return (default: 100)
- `filter` (optional): Additional filter string in Cloud Logging filter syntax
- `order` (optional): Sort order: "asc" or "desc" (default: "desc")

### `readLogs(options: ReadLogsOptions)`

Direct function that accepts all options at once. Useful for one-off queries.

#### Options

All service configuration and filter options combined:
- `service`, `project`, `region` (service configuration)
- `severity`, `startTime`, `endTime`, `limit`, `filter`, `order` (filter options)

#### Returns

`Promise<OperationResult<ReadLogsResult>>`

The result contains:
- `success`: Boolean indicating if the operation was successful
- `data`: Contains `entries` (array of log entries), `count`, `service`, and optionally `project`
- `error`: Error message if the operation failed

## Examples

All examples use the curried pattern. For direct usage, combine service config and filter options.

### Filter by severity

```typescript
const readLogs = createReadLogs({ service: 'my-service' });

const errors = await readLogs({
  severity: 'ERROR',
  limit: 20,
});
```

### Filter by time range

```typescript
const readLogs = createReadLogs({ service: 'my-service' });

const todayLogs = await readLogs({
  startTime: '2024-01-01T00:00:00Z',
  endTime: '2024-01-02T00:00:00Z',
});
```

### Filter by region

```typescript
const readLogs = createReadLogs({
  service: 'my-service',
  region: 'us-central1',  // Configure region once
});

const logs = await readLogs({ limit: 100 });
```

### Custom filter

```typescript
const readLogs = createReadLogs({ service: 'my-service' });

const userLogs = await readLogs({
  filter: 'labels.user_id="123"',
});
```

### Multi-project setup

```typescript
// Create separate log readers for different services
const readProductionLogs = createReadLogs({
  service: 'api-service',
  project: 'my-prod-project',
  region: 'us-central1',
});

const readStagingLogs = createReadLogs({
  service: 'api-service',
  project: 'my-staging-project',
  region: 'us-west1',
});

// Use them independently
const prodErrors = await readProductionLogs({ severity: 'ERROR' });
const stagingWarnings = await readStagingLogs({ severity: 'WARNING' });
```

## Claude Agent SDK Integration

Use logging tools with AI agents via the Claude Agent SDK:

```typescript
import { query } from '@anthropic-ai/claude-agent-sdk';
import { createClaudeAgentLogsTools } from '@agent-toolkit/logs/claude-agent-sdk';

// Create log reading tool configured for your service
const logsServer = createClaudeAgentLogsTools({
  service: 'my-service',
  project: 'my-project',      // optional
  region: 'us-central1',      // optional
});

// Use with Claude Agent SDK
const result = await query({
  prompt: 'Show me the latest error logs from the past hour',
  options: {
    mcpServers: {
      logs: logsServer,
    },
  },
});

// The agent can now read logs using the read_logs tool
```

The agent will have access to the `read_logs` tool which accepts:
- `severity`: Filter by log level (DEBUG, INFO, WARNING, ERROR)
- `startTime`: Start time (ISO 8601 or relative like "1h")
- `endTime`: End time (ISO 8601 or relative)
- `limit`: Maximum entries to return (default: 100, max: 1000)
- `filter`: Custom Cloud Logging filter string
- `order`: Sort order ("asc" or "desc", default: "desc")

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
