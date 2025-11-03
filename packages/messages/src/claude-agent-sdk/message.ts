import type { SDKMessage } from '@anthropic-ai/claude-agent-sdk';
import { formatMessage } from '../core/formatter';
import type { Message, MessageFormatter, MessageType, ToolCall } from '../core/types';

/**
 * Adapter for Claude Agent SDK messages
 *
 * Converts Claude Agent SDK SDKMessage to generic Message format and uses core formatter
 *
 * @param message Claude Agent SDK SDKMessage
 * @returns MessageFormatter with type checks and formatters
 */
export function ClaudeAgentMessage(message: SDKMessage): MessageFormatter {
  let genericMessage: Message;

  if (message.type === 'assistant') {
    // Extract content and tool calls from assistant message
    const content = message.message.content;
    let textContent = '';
    const toolCalls: ToolCall[] = [];

    // Content is an array of text and tool_use blocks
    for (const block of content) {
      if (block.type === 'text') {
        textContent += block.text;
      } else if (block.type === 'tool_use') {
        toolCalls.push({
          name: block.name,
          args: block.input as Record<string, unknown>,
          id: block.id,
        });
      }
    }

    genericMessage = {
      type: 'ai',
      content: textContent,
      toolCalls,
      original: message,
    };
  } else if (message.type === 'result') {
    // Result message - treat as AI response
    // Check if it's a success result (has result field) or error result (has errors field)
    if (message.subtype === 'success') {
      genericMessage = {
        type: 'ai',
        content: message.result || '',
        original: message,
      };
    } else {
      // Error result - join errors
      const errorContent = message.errors?.join('\n') || 'Unknown error';
      genericMessage = {
        type: 'system',
        content: `Error: ${errorContent}`,
        original: message,
      };
    }
  } else if (message.type === 'system') {
    // System message - handle different subtypes
    if (message.subtype === 'init') {
      // Init system message - format key information
      const info = [
        `Model: ${message.model}`,
        `CWD: ${message.cwd}`,
        `Tools: ${message.tools.length} available`,
      ].join('\n');
      genericMessage = {
        type: 'system',
        content: info,
        original: message,
      };
    } else if (message.subtype === 'hook_response') {
      // Hook response message
      const hookOutput = [message.stdout, message.stderr].filter(Boolean).join('\n');
      genericMessage = {
        type: 'system',
        content: `Hook ${message.hook_name} (${message.hook_event}):\n${hookOutput}`,
        original: message,
      };
    } else if (message.subtype === 'compact_boundary') {
      // Compact boundary message
      genericMessage = {
        type: 'system',
        content: `Compact boundary: ${message.compact_metadata.trigger} (pre_tokens: ${message.compact_metadata.pre_tokens})`,
        original: message,
      };
    } else {
      // Unknown system message type
      genericMessage = {
        type: 'system',
        content: JSON.stringify(message),
        original: message,
      };
    }
  } else if (message.type === 'user') {
    // User message
    const content = message.message.content;
    const textContent = typeof content === 'string' ? content : JSON.stringify(content);
    genericMessage = {
      type: 'human',
      content: textContent,
      original: message,
    };
  } else {
    // Default fallback for other message types (stream_event, tool_progress, auth_status, etc.)
    genericMessage = {
      type: 'system',
      content: JSON.stringify(message),
      original: message,
    };
  }

  // Use core formatter
  return formatMessage(genericMessage);
}
