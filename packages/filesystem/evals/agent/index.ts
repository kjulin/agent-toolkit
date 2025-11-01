import { ChatAnthropic } from '@langchain/anthropic';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { createLangchainFileSystemTools, LangchainMessage } from '../../src/sdks/langchain';
import type { ZodSchema } from 'zod';
import type { ToolCall } from '../types';

/**
 * Result from running the agent
 */
export interface AgentResult {
  /** The agent's final response */
  response: string;
  /** All tool calls made during execution */
  toolCalls: ToolCall[];
  /** Whether the agent completed successfully */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Structured result from submit_result tool call (if resultSchema was provided) */
  structuredResult?: Record<string, unknown>;
}

/**
 * Generic system prompt for the filesystem assistant
 */
const SYSTEM_PROMPT = `You are a filesystem assistant. You have access to tools to read, write, edit, search, and navigate files.

Important guidelines:
1. Use the available tools to explore and analyze the filesystem
2. Be systematic and thorough in your work
3. When you have found the answer, provide a clear final response
4. List file paths relative to the workspace root
5. Double-check your results before providing the final answer

Available tools:
- read_file: Read contents of a file
- write_file: Write content to a file
- edit_file: Edit a file by replacing text
- list_directory: List directory contents
- find_files: Find files matching a glob pattern (e.g., "**/*.ts" for all TypeScript files)
- search_content: Search for patterns in file contents using ripgrep
  - Use the 'glob' parameter to filter by file pattern (e.g., glob: "*.ts")
  - Use the 'type' parameter to filter by file type (e.g., type: "ts")
  - Leave 'path' empty to search the entire workspace, or specify a single directory
  - DO NOT use comma-separated paths - call the tool multiple times if needed

Think step by step and use the tools effectively.`;

/**
 * Run the filesystem agent on a task
 */
export async function runAgent(
  task: string,
  workspace: string,
  config: {
    model?: string;
    apiKey: string;
    maxIterations?: number;
    verbose?: boolean;
    resultSchema?: ZodSchema;
  }
): Promise<AgentResult> {
  const { model = 'claude-sonnet-4-5-20250929', apiKey, maxIterations = 30, verbose = false, resultSchema } = config;

  try {
    // Create filesystem tools
    const tools = createLangchainFileSystemTools({ workspace });

    // Capture structured result via closure
    let structuredResult: Record<string, unknown> | undefined;

    // Add result submission tool if schema provided
    if (resultSchema) {
      const submitResultTool = new DynamicStructuredTool({
        name: 'submit_result',
        description: 'Submit your final structured result. You MUST call this tool with your answer before providing your final response.',
        schema: resultSchema,
        func: async (input: Record<string, unknown>) => {
          // Capture the structured data
          structuredResult = input;
          return 'Result submitted successfully';
        },
      });
      tools.push(submitResultTool);
    }

    // Create LLM with minimal config to avoid parameter conflicts
    const llm = new ChatAnthropic({
      model: "claude-3-haiku-20240307",
      temperature: 0,
      maxTokens: undefined,
      maxRetries: 2,
    });

    // Create ReAct agent
    const agent = createReactAgent({
      llm,
      tools,
    });

    // Build system message with submit_result tool if needed
    let systemMessage = SYSTEM_PROMPT;
    if (resultSchema) {
      systemMessage += '\n- submit_result: Submit your final structured answer (REQUIRED before final response)';
    }

    // Build task message with submit_result instruction if needed
    let taskMessage = task;
    if (resultSchema) {
      taskMessage += '\n\nIMPORTANT: Before providing your final response, you MUST call the submit_result tool with your structured answer. After calling submit_result, provide a human-readable explanation of your findings.';
    }

    const input = {
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: taskMessage }
      ],
    };

    const config_opts = {
      recursionLimit: maxIterations,
    };

    let result;

    if (verbose) {
      console.log('\n=== Agent Starting ===\n');

      // Stream mode for verbose output
      const allMessages = [];
      const stream = await agent.stream(input, config_opts);

      for await (const chunk of stream) {
        if (chunk.agent) {
          const messages = chunk.agent.messages;
          for (const message of messages) {
            allMessages.push(message);

            // Use LangchainMessage factory for formatting
            const msg = LangchainMessage(message);
            console.log(msg.terminal());
          }
        }

        if (chunk.tools) {
          // Tool results - these come through chunk.tools.messages
          const messages = chunk.tools.messages;
          for (const message of messages) {
            allMessages.push(message);

            // Use LangchainMessage factory for formatting
            const msg = LangchainMessage(message);
            console.log(msg.terminal());
          }
        }
      }

      result = { messages: allMessages };
      console.log('\n=== Agent Completed ===\n');
    } else {
      // Non-verbose mode - just invoke
      result = await agent.invoke(input, config_opts);
    }

    // Extract tool calls and final response
    const toolCalls: ToolCall[] = [];
    let finalResponse = '';

    for (const message of result.messages) {
      // Extract tool calls
      if (message.tool_calls && message.tool_calls.length > 0) {
        for (const toolCall of message.tool_calls) {
          toolCalls.push({
            name: toolCall.name,
            input: toolCall.args as Record<string, unknown>,
            output: '', // Will be filled from tool messages
            success: true,
          });
        }
      }

      // Extract tool responses
      if (message.type === 'tool') {
        const lastToolCall = toolCalls[toolCalls.length - 1];
        if (lastToolCall) {
          lastToolCall.output = message.content as string;
        }
      }

      // Extract final response (last AI message without tool calls)
      if (message.type === 'ai' && (!message.tool_calls || message.tool_calls.length === 0)) {
        finalResponse = message.content as string;
      }
    }

    return {
      response: finalResponse,
      toolCalls,
      success: true,
      structuredResult, // Captured via closure in submit_result tool
    };
  } catch (error) {
    return {
      response: '',
      toolCalls: [],
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
