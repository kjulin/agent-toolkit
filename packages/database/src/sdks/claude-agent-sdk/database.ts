import { tool, createSdkMcpServer } from '@anthropic-ai/claude-agent-sdk';
import type { McpSdkServerConfigWithInstance } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import { createDatabase } from '../../core/index';

/**
 * Options for creating Claude Agent SDK database tools
 */
export interface ClaudeAgentDatabaseToolsOptions {
  /** PostgreSQL connection string */
  connectionString: string;
  /** Enable PII masking in query results (future feature) */
  maskPII?: boolean;
}

/**
 * Creates database tools for use with Claude Agent SDK
 *
 * @param options Configuration options for database tools
 * @returns MCP server configuration with database tools
 *
 * @example
 * ```typescript
 * import { query } from '@anthropic-ai/claude-agent-sdk';
 * import { createClaudeAgentDatabaseTools } from '@agent-toolkit/database/claude-agent-sdk';
 *
 * const dbServer = createClaudeAgentDatabaseTools({
 *   connectionString: 'postgresql://user:pass@localhost:5432/mydb',
 *   maskPII: true
 * });
 *
 * const result = await query({
 *   prompt: 'List all tables in the database',
 *   options: {
 *     mcpServers: {
 *       database: dbServer
 *     }
 *   }
 * });
 * ```
 */
export function createClaudeAgentDatabaseTools(
  options: ClaudeAgentDatabaseToolsOptions
): McpSdkServerConfigWithInstance {
  const { connectionString, maskPII = false } = options;

  // Create database instance
  const db = createDatabase(connectionString, { maskPII });

  // Create MCP tool
  const executeSelectTool = tool(
    'execute_select',
    'Execute a SELECT query on the PostgreSQL database. Use this to retrieve data from tables and explore the database schema. Supports parameterized queries for safety. Only SELECT and WITH (CTE) queries are allowed. You can query information_schema tables to explore the database structure.',
    {
      query: z
        .string()
        .describe(
          'SQL SELECT query to execute. Must start with SELECT or WITH. Can include WHERE, JOIN, ORDER BY, LIMIT, etc. Query information_schema.tables and information_schema.columns to explore schema.'
        ),
      params: z
        .array(z.any())
        .optional()
        .describe(
          'Optional array of parameters for parameterized queries (e.g., for WHERE clauses). Use $1, $2, etc. in the query.'
        ),
    },
    async (args, _extra) => {
      const { query, params } = args;

      const result = await db.select(query, params);

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
                rows: result.data!.rows,
                rowCount: result.data!.rowCount,
                fields: result.data!.fields.map((f) => ({
                  name: f.name,
                  dataTypeID: f.dataTypeID,
                })),
                ...(result.data!.piiFields && {
                  piiFields: result.data!.piiFields,
                }),
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
    name: 'database',
    version: '0.1.0',
    tools: [executeSelectTool],
  });
}
