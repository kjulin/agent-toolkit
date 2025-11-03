/**
 * Core message types - framework agnostic
 */

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
  toolCallId?: string;
  toolName?: string;
}

/**
 * Message types
 */
export type MessageType = 'ai' | 'human' | 'system' | 'tool';

/**
 * Generic message representation (framework-agnostic)
 */
export interface Message {
  type: MessageType;
  content: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
  toolName?: string;
  /** Original SDK-specific message object */
  original?: any;
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
  /** Returns the generic message as formatted JSON (without original field) */
  raw: () => string;
  /** Returns the original SDK-specific message as formatted JSON */
  original: () => string;
}
