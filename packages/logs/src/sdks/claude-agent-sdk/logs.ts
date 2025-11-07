import { tool, createSdkMcpServer } from '@anthropic-ai/claude-agent-sdk';
import type { McpSdkServerConfigWithInstance } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import { createReadLogs } from '../../core/index';
import type { ServiceConfig } from '../../types';

/**
 * Options for creating Claude Agent SDK log reading tools
 */
export interface ClaudeAgentLogsToolsOptions extends ServiceConfig {}

/**
 * Creates log reading tools for use with Claude Agent SDK
 *
 * @param options Configuration options for log reading tools
 * @returns MCP server configuration with log reading tools
 *
 * @example
 * ```typescript
 * import { query } from '@anthropic-ai/claude-agent-sdk';
 * import { createClaudeAgentLogsTools } from '@agent-toolkit/logs/claude-agent-sdk';
 *
 * // Using default credentials (gcloud auth application-default login)
 * const logsServer = createClaudeAgentLogsTools({
 *   service: 'my-service',
 *   project: 'my-project',
 *   region: 'us-central1'
 * });
 *
 * // Using a service account key file
 * const logsServerWithAuth = createClaudeAgentLogsTools({
 *   service: 'my-service',
 *   project: 'my-project',
 *   region: 'us-central1',
 *   auth: {
 *     keyFilename: '/path/to/service-account-key.json'
 *   }
 * });
 *
 * // Using credentials object
 * const logsServerWithCreds = createClaudeAgentLogsTools({
 *   service: 'my-service',
 *   project: 'my-project',
 *   region: 'us-central1',
 *   auth: {
 *     credentials: {
 *       client_email: 'service-account@project.iam.gserviceaccount.com',
 *       private_key: process.env.PRIVATE_KEY!
 *     }
 *   }
 * });
 *
 * const result = await query({
 *   prompt: 'Show me recent error logs',
 *   options: {
 *     mcpServers: {
 *       logs: logsServer
 *     }
 *   }
 * });
 * ```
 */
export function createClaudeAgentLogsTools(
  options: ClaudeAgentLogsToolsOptions
): McpSdkServerConfigWithInstance {
  // Create curried readLogs function configured for this service
  const readLogs = createReadLogs(options);

  // Create MCP tool
  const readLogsTool = tool(
    'read_logs',
    `Read logs from Cloud Run service "${options.service}"${options.region ? ` in ${options.region}` : ''}. Use this to inspect application logs, debug issues, and monitor service health. Filter by severity (ERROR, WARNING, INFO, DEBUG), time range, or custom filters.`,
    {
      severity: z
        .enum(['DEBUG', 'INFO', 'WARNING', 'ERROR'])
        .optional()
        .describe('Filter logs by severity level (DEBUG, INFO, WARNING, ERROR)'),
      startTime: z
        .string()
        .optional()
        .describe(
          'Start time for log entries. ISO 8601 format (e.g., "2024-01-01T00:00:00Z") or relative time (e.g., "1h" for 1 hour ago, "30m" for 30 minutes ago)'
        ),
      endTime: z
        .string()
        .optional()
        .describe(
          'End time for log entries. ISO 8601 format or relative time'
        ),
      limit: z
        .number()
        .int()
        .positive()
        .max(1000)
        .optional()
        .default(100)
        .describe('Maximum number of log entries to return (default: 100, max: 1000)'),
      filter: z
        .string()
        .optional()
        .describe(
          'Additional filter string in Cloud Logging filter syntax (e.g., \'labels.user_id="123"\')'
        ),
      order: z
        .enum(['asc', 'desc'])
        .optional()
        .default('desc')
        .describe('Sort order for timestamps: "asc" (oldest first) or "desc" (newest first, default)'),
    },
    async (args, _extra) => {
      const result = await readLogs(args);

      if (!result.success) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: result.error }, null, 2),
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                count: result.data!.count,
                service: result.data!.service,
                project: result.data!.project,
                entries: result.data!.entries.map((entry) => ({
                  timestamp: entry.timestamp,
                  severity: entry.severity,
                  message: entry.message,
                  ...(entry.resource && { resource: entry.resource }),
                  ...(entry.labels && { labels: entry.labels }),
                  ...(entry.jsonPayload && { jsonPayload: entry.jsonPayload }),
                })),
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // Create and return MCP server
  return createSdkMcpServer({
    name: 'logs',
    version: '0.1.0',
    tools: [readLogsTool],
  });
}
