import type { BaseMessage } from '@langchain/core/messages';

/**
 * Tool call extracted from a message
 */
export interface ToolCall {
  name: string;
  args: Record<string, unknown>;
  id?: string;
}

/**
 * Tool response extracted from a message
 */
export interface ToolResponse {
  output: string;
}

/**
 * Message formatter interface
 */
export interface MessageFormatter {
  isAI: () => boolean;
  isTool: () => boolean;
  isToolCall: () => boolean;
  isToolResponse: () => boolean;
  getToolCalls: () => ToolCall[];
  getToolResponse: () => ToolResponse | null;
  getContent: () => string;
  terminal: () => string;
}

/**
 * Functional factory for wrapping LangChain messages
 *
 * @param message LangChain BaseMessage
 * @returns MessageFormatter with type checks and formatters
 */
export function LangchainMessage(message: BaseMessage): MessageFormatter {
  // Parse message once, cache in closure
  const type = message._getType();
  const content = typeof message.content === 'string' ? message.content : '';
  const toolCalls = (message as any).tool_calls || [];
  const toolCallId = (message as any).tool_call_id;
  const toolName = (message as any).name;

  return {
    isAI: () => type === 'ai',

    isTool: () => type === 'tool',

    isToolCall: () => type === 'ai' && toolCalls.length > 0,

    isToolResponse: () => type === 'tool',

    getToolCalls: () => toolCalls.map((tc: any) => ({
      name: tc.name,
      args: tc.args,
      id: tc.id,
    })),

    getToolResponse: () => {
      if (type !== 'tool') return null;
      return { output: content };
    },

    getContent: () => content,

    terminal: () => {
      // AI message with tool calls
      if (type === 'ai' && toolCalls.length > 0) {
        let output = '';
        for (const toolCall of toolCalls) {
          output += `\n🔧 ${toolCall.name}\n`;
          // Format args nicely
          const args = toolCall.args;
          for (const [key, value] of Object.entries(args)) {
            const valueStr = typeof value === 'string' ? value : JSON.stringify(value);
            const truncated = valueStr.length > 80 ? valueStr.substring(0, 77) + '...' : valueStr;
            output += `   • ${key}: ${truncated}\n`;
          }
        }
        return output.trim();
      }

      // Tool response
      if (type === 'tool') {
        const maxLength = 300;

        // Check if this is an error response
        const isError = content.startsWith('Error:');
        const icon = isError ? '❌' : '✓';
        const toolLabel = toolName ? ` ${toolName}` : '';

        let output = `\n${icon}${toolLabel}`;

        if (content.length > maxLength) {
          output += ` (${content.length} chars)\n`;
          output += `   ${content.substring(0, maxLength).trim()}...`;
        } else {
          output += `\n`;
          // Indent each line
          const lines = content.split('\n');
          for (const line of lines.slice(0, 10)) { // Max 10 lines
            output += `   ${line}\n`;
          }
          if (lines.length > 10) {
            output += `   ... (${lines.length - 10} more lines)`;
          }
        }

        return output.trim();
      }

      // AI final response
      if (type === 'ai') {
        if (!content) {
          return '\n💬 Agent\n   (empty response)';
        }

        let output = '\n💬 Agent\n';
        // Indent each line
        const lines = content.split('\n');
        for (const line of lines) {
          output += `   ${line}\n`;
        }

        return output.trim();
      }

      // Fallback for other message types
      return `\n[${type}] ${content}`;
    },
  };
}
