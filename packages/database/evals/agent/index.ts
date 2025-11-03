/**
 * Agent implementation for database tool evaluations
 * Uses Claude Agent SDK with database tools
 */

import { query } from '@anthropic-ai/claude-agent-sdk';
import type { SDKMessage } from '@anthropic-ai/claude-agent-sdk';
import { ClaudeAgentMessage } from '@agent-toolkit/messages';
import { createClaudeAgentDatabaseTools } from '../../src/sdks/claude-agent-sdk';
import type { ToolCall } from '../types';

export interface AgentConfig {
  apiKey: string;
  model?: string;
  connectionString: string;
  maskPII?: boolean;
}

export interface AgentResult {
  response: string;
  toolCalls: ToolCall[];
}

/**
 * Runs an agent with database tools to complete a task
 */
export async function runAgent(
  task: string,
  config: AgentConfig
): Promise<AgentResult> {
  // Create database MCP server
  const dbServer = createClaudeAgentDatabaseTools({
    connectionString: config.connectionString,
    maskPII: config.maskPII ?? false,
  });

  const toolCalls: ToolCall[] = [];

  let finalResponse = '';

  try {
    // Run agent with database tools
    // Note: SDK-type MCP servers run in-process, so we don't specify pathToClaudeCodeExecutable
    const result = query({
      prompt: task,
      options: {
        model: config.model,
        mcpServers: {
          database: dbServer,
        },
        // Disable permissions for evals
        permissionMode: "bypassPermissions",
      },
    });

    // Collect messages and extract tool calls
    for await (const message of result) {
      // Format message using ClaudeAgentMessage
      const formatter = ClaudeAgentMessage(message);

      // Display formatted terminal output
      const terminalOutput = formatter.raw();
      if (terminalOutput) {
        console.log(terminalOutput);
      }

      // Extract assistant responses and tool calls
      if (formatter.isAI()) {
        const content = formatter.getContent();
        if (content) {
          finalResponse = content;
        }

        // Extract tool calls
        if (formatter.isToolCall()) {
          const messageCalls = formatter.getToolCalls();
          for (const toolCall of messageCalls) {
            toolCalls.push({
              toolName: toolCall.name,
              input: toolCall.args,
              output: '', // Will be filled from result messages
              timestamp: Date.now(),
            });
          }
        }
      }
    }
  } catch (error) {
    console.error('Error running agent:');
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('Full error object:', error);
    throw error;
  }

  return {
    response: finalResponse,
    toolCalls: [],
  };
}
