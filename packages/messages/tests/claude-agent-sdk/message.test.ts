import { describe, it, expect } from 'vitest';
import type { SDKMessage, SDKAssistantMessage, SDKResultMessage, SDKSystemMessage, SDKUserMessage } from '@anthropic-ai/claude-agent-sdk';
import { ClaudeAgentMessage } from '../../src/claude-agent-sdk/message';

describe('ClaudeAgentMessage', () => {
  describe('type detection', () => {
    it('should detect assistant messages as AI', () => {
      const assistantMsg: SDKAssistantMessage = {
        type: 'assistant',
        message: {
          id: 'msg_123',
          type: 'message',
          role: 'assistant',
          content: [
            {
              type: 'text',
              text: 'Hello, I can help you with that.',
            },
          ],
          model: 'claude-3-5-sonnet-20241022',
          stop_reason: 'end_turn',
          stop_sequence: null,
          usage: {
            input_tokens: 100,
            output_tokens: 50,
          },
        },
        parent_tool_use_id: null,
        uuid: '123e4567-e89b-12d3-a456-426614174000' as any,
        session_id: 'session_123',
      };
      const msg = ClaudeAgentMessage(assistantMsg);

      expect(msg.isAI()).toBe(true);
      expect(msg.isTool()).toBe(false);
    });

    it('should detect result messages as AI', () => {
      const resultMsg: SDKResultMessage = {
        type: 'result',
        subtype: 'success',
        duration_ms: 1000,
        duration_api_ms: 800,
        is_error: false,
        num_turns: 3,
        result: 'Task completed successfully',
        total_cost_usd: 0.001,
        usage: {
          input_tokens: 100,
          output_tokens: 50,
          cache_creation_input_tokens: 0,
          cache_read_input_tokens: 0,
        },
        modelUsage: {},
        permission_denials: [],
        uuid: '123e4567-e89b-12d3-a456-426614174000' as any,
        session_id: 'session_123',
      };
      const msg = ClaudeAgentMessage(resultMsg);

      expect(msg.isAI()).toBe(true);
      expect(msg.isTool()).toBe(false);
    });

    it('should detect system messages', () => {
      const systemMsg: SDKSystemMessage = {
        type: 'system',
        subtype: 'init',
        agents: [],
        apiKeySource: 'user',
        claude_code_version: '1.0.0',
        cwd: '/home/user/project',
        tools: ['search_content', 'find_files'],
        mcp_servers: [],
        model: 'claude-3-5-sonnet-20241022',
        permissionMode: 'default',
        slash_commands: [],
        output_style: 'default',
        skills: [],
        plugins: [],
        uuid: '123e4567-e89b-12d3-a456-426614174000' as any,
        session_id: 'session_123',
      };
      const msg = ClaudeAgentMessage(systemMsg);

      expect(msg.isAI()).toBe(false);
      expect(msg.isTool()).toBe(false);
    });

    it('should detect assistant messages with tool calls', () => {
      const assistantMsgWithTools: SDKAssistantMessage = {
        type: 'assistant',
        message: {
          id: 'msg_123',
          type: 'message',
          role: 'assistant',
          content: [
            {
              type: 'tool_use',
              id: 'toolu_123',
              name: 'search_content',
              input: {
                pattern: 'import.*fs',
                type: 'ts',
              },
            },
          ],
          model: 'claude-3-5-sonnet-20241022',
          stop_reason: 'tool_use',
          stop_sequence: null,
          usage: {
            input_tokens: 100,
            output_tokens: 50,
          },
        },
        parent_tool_use_id: null,
        uuid: '123e4567-e89b-12d3-a456-426614174000' as any,
        session_id: 'session_123',
      };
      const msg = ClaudeAgentMessage(assistantMsgWithTools);

      expect(msg.isToolCall()).toBe(true);
      expect(msg.isAI()).toBe(true);
    });

    it('should detect user messages as human', () => {
      const userMsg: SDKUserMessage = {
        type: 'user',
        message: {
          role: 'user',
          content: 'Hello, can you help me?',
        },
        parent_tool_use_id: null,
        uuid: '123e4567-e89b-12d3-a456-426614174000' as any,
        session_id: 'session_123',
      };
      const msg = ClaudeAgentMessage(userMsg);

      expect(msg.isAI()).toBe(false);
    });
  });

  describe('data extraction', () => {
    it('should extract tool calls from assistant message', () => {
      const assistantMsg: SDKAssistantMessage = {
        type: 'assistant',
        message: {
          id: 'msg_123',
          type: 'message',
          role: 'assistant',
          content: [
            {
              type: 'tool_use',
              id: 'toolu_123',
              name: 'search_content',
              input: {
                pattern: 'import.*fs',
                type: 'ts',
              },
            },
          ],
          model: 'claude-3-5-sonnet-20241022',
          stop_reason: 'tool_use',
          stop_sequence: null,
          usage: {
            input_tokens: 100,
            output_tokens: 50,
          },
        },
        parent_tool_use_id: null,
        uuid: '123e4567-e89b-12d3-a456-426614174000' as any,
        session_id: 'session_123',
      };
      const msg = ClaudeAgentMessage(assistantMsg);
      const toolCalls = msg.getToolCalls();

      expect(toolCalls).toHaveLength(1);
      expect(toolCalls[0].name).toBe('search_content');
      expect(toolCalls[0].args).toEqual({
        pattern: 'import.*fs',
        type: 'ts',
      });
      expect(toolCalls[0].id).toBe('toolu_123');
    });

    it('should extract multiple tool calls', () => {
      const assistantMsg: SDKAssistantMessage = {
        type: 'assistant',
        message: {
          id: 'msg_123',
          type: 'message',
          role: 'assistant',
          content: [
            {
              type: 'tool_use',
              id: 'toolu_1',
              name: 'find_files',
              input: { pattern: '**/*.ts' },
            },
            {
              type: 'tool_use',
              id: 'toolu_2',
              name: 'search_content',
              input: { pattern: 'import.*fs', glob: '*.ts' },
            },
          ],
          model: 'claude-3-5-sonnet-20241022',
          stop_reason: 'tool_use',
          stop_sequence: null,
          usage: {
            input_tokens: 100,
            output_tokens: 50,
          },
        },
        parent_tool_use_id: null,
        uuid: '123e4567-e89b-12d3-a456-426614174000' as any,
        session_id: 'session_123',
      };
      const msg = ClaudeAgentMessage(assistantMsg);
      const toolCalls = msg.getToolCalls();

      expect(toolCalls).toHaveLength(2);
      expect(toolCalls[0].name).toBe('find_files');
      expect(toolCalls[1].name).toBe('search_content');
    });

    it('should extract text content from assistant message', () => {
      const assistantMsg: SDKAssistantMessage = {
        type: 'assistant',
        message: {
          id: 'msg_123',
          type: 'message',
          role: 'assistant',
          content: [
            {
              type: 'text',
              text: 'Based on my search, I found 3 TypeScript files.',
            },
          ],
          model: 'claude-3-5-sonnet-20241022',
          stop_reason: 'end_turn',
          stop_sequence: null,
          usage: {
            input_tokens: 100,
            output_tokens: 50,
          },
        },
        parent_tool_use_id: null,
        uuid: '123e4567-e89b-12d3-a456-426614174000' as any,
        session_id: 'session_123',
      };
      const msg = ClaudeAgentMessage(assistantMsg);

      expect(msg.getContent()).toBe('Based on my search, I found 3 TypeScript files.');
    });

    it('should handle mixed content (text + tool calls)', () => {
      const assistantMsg: SDKAssistantMessage = {
        type: 'assistant',
        message: {
          id: 'msg_123',
          type: 'message',
          role: 'assistant',
          content: [
            {
              type: 'text',
              text: 'Let me search for that.',
            },
            {
              type: 'tool_use',
              id: 'toolu_123',
              name: 'search_content',
              input: { pattern: 'import.*fs' },
            },
          ],
          model: 'claude-3-5-sonnet-20241022',
          stop_reason: 'tool_use',
          stop_sequence: null,
          usage: {
            input_tokens: 100,
            output_tokens: 50,
          },
        },
        parent_tool_use_id: null,
        uuid: '123e4567-e89b-12d3-a456-426614174000' as any,
        session_id: 'session_123',
      };
      const msg = ClaudeAgentMessage(assistantMsg);

      expect(msg.getContent()).toBe('Let me search for that.');
      expect(msg.getToolCalls()).toHaveLength(1);
    });
  });

  describe('terminal formatter', () => {
    it('should format assistant message with tool call', () => {
      const assistantMsg: SDKAssistantMessage = {
        type: 'assistant',
        message: {
          id: 'msg_123',
          type: 'message',
          role: 'assistant',
          content: [
            {
              type: 'tool_use',
              id: 'toolu_123',
              name: 'search_content',
              input: {
                pattern: 'import.*fs',
                type: 'ts',
              },
            },
          ],
          model: 'claude-3-5-sonnet-20241022',
          stop_reason: 'tool_use',
          stop_sequence: null,
          usage: {
            input_tokens: 100,
            output_tokens: 50,
          },
        },
        parent_tool_use_id: null,
        uuid: '123e4567-e89b-12d3-a456-426614174000' as any,
        session_id: 'session_123',
      };
      const msg = ClaudeAgentMessage(assistantMsg);
      const output = msg.terminal();

      expect(output).toContain('🔧');
      expect(output).toContain('search_content');
      expect(output).toContain('pattern');
      expect(output).toContain('import.*fs');
    });

    it('should format assistant message with text', () => {
      const assistantMsg: SDKAssistantMessage = {
        type: 'assistant',
        message: {
          id: 'msg_123',
          type: 'message',
          role: 'assistant',
          content: [
            {
              type: 'text',
              text: 'Based on my search, I found 3 TypeScript files.',
            },
          ],
          model: 'claude-3-5-sonnet-20241022',
          stop_reason: 'end_turn',
          stop_sequence: null,
          usage: {
            input_tokens: 100,
            output_tokens: 50,
          },
        },
        parent_tool_use_id: null,
        uuid: '123e4567-e89b-12d3-a456-426614174000' as any,
        session_id: 'session_123',
      };
      const msg = ClaudeAgentMessage(assistantMsg);
      const output = msg.terminal();

      expect(output).toContain('💬');
      expect(output).toContain('Based on my search');
    });

    it('should format success result message', () => {
      const resultMsg: SDKResultMessage = {
        type: 'result',
        subtype: 'success',
        duration_ms: 1000,
        duration_api_ms: 800,
        is_error: false,
        num_turns: 3,
        result: 'Task completed successfully',
        total_cost_usd: 0.001,
        usage: {
          input_tokens: 100,
          output_tokens: 50,
          cache_creation_input_tokens: 0,
          cache_read_input_tokens: 0,
        },
        modelUsage: {},
        permission_denials: [],
        uuid: '123e4567-e89b-12d3-a456-426614174000' as any,
        session_id: 'session_123',
      };
      const msg = ClaudeAgentMessage(resultMsg);
      const output = msg.terminal();

      expect(output).toContain('💬');
      expect(output).toContain('Task completed successfully');
    });

    it('should format error result message', () => {
      const resultMsg: SDKResultMessage = {
        type: 'result',
        subtype: 'error_during_execution',
        duration_ms: 1000,
        duration_api_ms: 800,
        is_error: true,
        num_turns: 3,
        total_cost_usd: 0.001,
        usage: {
          input_tokens: 100,
          output_tokens: 50,
          cache_creation_input_tokens: 0,
          cache_read_input_tokens: 0,
        },
        modelUsage: {},
        permission_denials: [],
        errors: ['Tool execution failed', 'Connection timeout'],
        uuid: '123e4567-e89b-12d3-a456-426614174000' as any,
        session_id: 'session_123',
      };
      const msg = ClaudeAgentMessage(resultMsg);
      const output = msg.terminal();

      expect(output).toContain('Error:');
      expect(output).toContain('Tool execution failed');
    });

    it('should format system init message', () => {
      const systemMsg: SDKSystemMessage = {
        type: 'system',
        subtype: 'init',
        agents: [],
        apiKeySource: 'user',
        claude_code_version: '1.0.0',
        cwd: '/home/user/project',
        tools: ['search_content', 'find_files'],
        mcp_servers: [],
        model: 'claude-3-5-sonnet-20241022',
        permissionMode: 'default',
        slash_commands: [],
        output_style: 'default',
        skills: [],
        plugins: [],
        uuid: '123e4567-e89b-12d3-a456-426614174000' as any,
        session_id: 'session_123',
      };
      const msg = ClaudeAgentMessage(systemMsg);
      const output = msg.terminal();

      expect(output).toContain('Model: claude-3-5-sonnet-20241022');
      expect(output).toContain('CWD: /home/user/project');
      expect(output).toContain('Tools: 2 available');
    });
  });

  describe('raw output', () => {
    it('should output assistant message as formatted JSON', () => {
      const assistantMsg: SDKAssistantMessage = {
        type: 'assistant',
        message: {
          id: 'msg_123',
          type: 'message',
          role: 'assistant',
          content: [
            {
              type: 'text',
              text: 'Hello, I can help you with that.',
            },
          ],
          model: 'claude-3-5-sonnet-20241022',
          stop_reason: 'end_turn',
          stop_sequence: null,
          usage: {
            input_tokens: 100,
            output_tokens: 50,
          },
        },
        parent_tool_use_id: null,
        uuid: '123e4567-e89b-12d3-a456-426614174000' as any,
        session_id: 'session_123',
      };
      const msg = ClaudeAgentMessage(assistantMsg);
      const raw = msg.raw();

      const parsed = JSON.parse(raw);
      expect(parsed.type).toBe('ai');
      expect(parsed.content).toBe('Hello, I can help you with that.');
    });

    it('should output assistant message with tool calls as formatted JSON', () => {
      const assistantMsg: SDKAssistantMessage = {
        type: 'assistant',
        message: {
          id: 'msg_123',
          type: 'message',
          role: 'assistant',
          content: [
            {
              type: 'text',
              text: 'Let me search for that.',
            },
            {
              type: 'tool_use',
              id: 'toolu_123',
              name: 'search_content',
              input: { pattern: 'import.*fs', type: 'ts' },
            },
          ],
          model: 'claude-3-5-sonnet-20241022',
          stop_reason: 'tool_use',
          stop_sequence: null,
          usage: {
            input_tokens: 100,
            output_tokens: 50,
          },
        },
        parent_tool_use_id: null,
        uuid: '123e4567-e89b-12d3-a456-426614174000' as any,
        session_id: 'session_123',
      };
      const msg = ClaudeAgentMessage(assistantMsg);
      const raw = msg.raw();

      const parsed = JSON.parse(raw);
      expect(parsed.type).toBe('ai');
      expect(parsed.content).toBe('Let me search for that.');
      expect(parsed.toolCalls).toHaveLength(1);
      expect(parsed.toolCalls[0].name).toBe('search_content');
      expect(parsed.toolCalls[0].args.pattern).toBe('import.*fs');
    });

    it('should output result message as formatted JSON', () => {
      const resultMsg: SDKResultMessage = {
        type: 'result',
        subtype: 'success',
        duration_ms: 1000,
        duration_api_ms: 800,
        is_error: false,
        num_turns: 3,
        result: 'Task completed',
        total_cost_usd: 0.001,
        usage: {
          input_tokens: 100,
          output_tokens: 50,
          cache_creation_input_tokens: 0,
          cache_read_input_tokens: 0,
        },
        modelUsage: {},
        permission_denials: [],
        uuid: '123e4567-e89b-12d3-a456-426614174000' as any,
        session_id: 'session_123',
      };
      const msg = ClaudeAgentMessage(resultMsg);
      const raw = msg.raw();

      const parsed = JSON.parse(raw);
      expect(parsed.type).toBe('ai');
      expect(parsed.content).toBe('Task completed');
    });
  });
});
