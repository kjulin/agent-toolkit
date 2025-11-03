// Core exports (framework-agnostic)
export type {
  Message,
  MessageFormatter,
  MessageType,
  ToolCall,
  ToolResponse,
} from './core/types';
export { formatMessage } from './core/formatter';

// SDK-specific adapters
export { LangchainMessage } from './langchain';
export { ClaudeAgentMessage } from './claude-agent-sdk';
