import type { Message, MessageFormatter, ToolCall, ToolResponse } from './types';

/**
 * Functional factory for formatting generic messages
 *
 * @param message Generic Message
 * @returns MessageFormatter with type checks and formatters
 */
export function formatMessage(message: Message): MessageFormatter {
  // Parse message once, cache in closure
  const { type, content, toolCalls = [], toolCallId, toolName, original } = message;

  return {
    isAI: () => type === 'ai',

    isTool: () => type === 'tool',

    isToolCall: () => type === 'ai' && toolCalls.length > 0,

    isToolResponse: () => type === 'tool',

    getToolCalls: () => toolCalls,

    getToolResponse: (): ToolResponse | null => {
      if (type !== 'tool') return null;
      return {
        output: content,
        toolCallId,
        toolName,
      };
    },

    getContent: () => content,

    raw: () => {
      // Exclude the original field from output
      const { original: _, ...messageWithoutOriginal } = message;
      return JSON.stringify(messageWithoutOriginal, null, 2);
    },

    original: () => {
      if (original === undefined) {
        return 'null';
      }
      return JSON.stringify(original, null, 2);
    },

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
