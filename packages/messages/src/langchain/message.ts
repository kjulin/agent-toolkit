import type { BaseMessage } from '@langchain/core/messages';
import { formatMessage } from '../core/formatter';
import type { Message, MessageFormatter, MessageType } from '../core/types';

/**
 * Convert LangChain message type to generic MessageType
 */
function convertMessageType(langchainType: string): MessageType {
  switch (langchainType) {
    case 'ai':
      return 'ai';
    case 'human':
      return 'human';
    case 'system':
      return 'system';
    case 'tool':
      return 'tool';
    default:
      return 'system'; // fallback
  }
}

/**
 * Adapter for LangChain messages
 *
 * Converts LangChain BaseMessage to generic Message format and uses core formatter
 *
 * @param message LangChain BaseMessage
 * @returns MessageFormatter with type checks and formatters
 */
export function LangchainMessage(message: BaseMessage): MessageFormatter {
  // Convert LangChain message to generic format
  const type = convertMessageType(message._getType());
  const content = typeof message.content === 'string' ? message.content : '';
  const toolCalls = (message as any).tool_calls?.map((tc: any) => ({
    name: tc.name,
    args: tc.args,
    id: tc.id,
  })) || [];
  const toolCallId = (message as any).tool_call_id;
  const toolName = (message as any).name;

  const genericMessage: Message = {
    type,
    content,
    toolCalls,
    toolCallId,
    toolName,
    original: message,
  };

  // Use core formatter
  return formatMessage(genericMessage);
}
