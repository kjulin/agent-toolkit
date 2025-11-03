/**
 * Agent implementation for database tool evaluations
 * Uses Claude Agent SDK with database tools
 */

import { query } from '@anthropic-ai/claude-agent-sdk';
import type { SDKMessage } from '@anthropic-ai/claude-agent-sdk';
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
      console.log('Message type:', message.type);

      // Check for error messages
      if (message.type === 'error') {
        console.error('Error message received:', message);
        throw new Error(`Agent error: ${JSON.stringify(message)}`);
      }

      // Extract assistant text responses
      if (message.type === 'assistant') {
        const textContent = message.message.content.find(
          (c): c is { type: 'text'; text: string } => c.type === 'text'
        );
        if (textContent) {
          finalResponse = textContent.text;
        }

        // Extract tool uses
        const toolUses = message.message.content.filter(
          (c): c is { type: 'tool_use'; id: string; name: string; input: any } =>
            c.type === 'tool_use'
        );

        for (const toolUse of toolUses) {
          toolCalls.push({
            toolName: toolUse.name,
            input: toolUse.input,
            output: '', // Will be filled from result messages
            timestamp: Date.now(),
          });
        }
      }

      // Extract result messages for final response
      if (message.type === 'result' && message.subtype === 'success') {
        finalResponse = message.result;
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
    toolCalls,
  };
}
