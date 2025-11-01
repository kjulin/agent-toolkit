import { describe, it, expect } from 'vitest';
import { AIMessage, ToolMessage } from '@langchain/core/messages';
import { LangchainMessage } from './message';

describe('LangchainMessage', () => {
  describe('type detection', () => {
    it('should detect AI messages', () => {
      const aiMsg = new AIMessage('Hello, I can help you with that.');
      const msg = LangchainMessage(aiMsg);

      expect(msg.isAI()).toBe(true);
      expect(msg.isTool()).toBe(false);
    });

    it('should detect tool messages', () => {
      const toolMsg = new ToolMessage({
        content: 'Tool execution result',
        tool_call_id: 'call_123',
      });
      const msg = LangchainMessage(toolMsg);

      expect(msg.isTool()).toBe(true);
      expect(msg.isAI()).toBe(false);
    });

    it('should detect AI messages with tool calls', () => {
      const aiMsgWithTools = new AIMessage({
        content: '',
        tool_calls: [
          {
            name: 'search_content',
            args: {
              pattern: 'import.*fs',
              type: 'ts',
            },
            id: 'call_123',
          },
        ],
      });
      const msg = LangchainMessage(aiMsgWithTools);

      expect(msg.isToolCall()).toBe(true);
      expect(msg.isAI()).toBe(true);
    });

    it('should detect AI without tool calls', () => {
      const aiMsg = new AIMessage('Final response without tools');
      const msg = LangchainMessage(aiMsg);

      expect(msg.isToolCall()).toBe(false);
      expect(msg.isAI()).toBe(true);
    });
  });

  describe('data extraction', () => {
    it('should extract tool calls', () => {
      const aiMsg = new AIMessage({
        content: '',
        tool_calls: [
          {
            name: 'search_content',
            args: {
              pattern: 'import.*fs',
              type: 'ts',
            },
            id: 'call_123',
          },
        ],
      });
      const msg = LangchainMessage(aiMsg);
      const toolCalls = msg.getToolCalls();

      expect(toolCalls).toHaveLength(1);
      expect(toolCalls[0].name).toBe('search_content');
      expect(toolCalls[0].args).toEqual({
        pattern: 'import.*fs',
        type: 'ts',
      });
    });

    it('should extract multiple tool calls', () => {
      const aiMsg = new AIMessage({
        content: '',
        tool_calls: [
          {
            name: 'find_files',
            args: { pattern: '**/*.ts' },
            id: 'call_1',
          },
          {
            name: 'search_content',
            args: { pattern: 'import.*fs', glob: '*.ts' },
            id: 'call_2',
          },
        ],
      });
      const msg = LangchainMessage(aiMsg);
      const toolCalls = msg.getToolCalls();

      expect(toolCalls).toHaveLength(2);
      expect(toolCalls[0].name).toBe('find_files');
      expect(toolCalls[1].name).toBe('search_content');
    });

    it('should return empty array when no tool calls', () => {
      const aiMsg = new AIMessage('No tools used here');
      const msg = LangchainMessage(aiMsg);

      expect(msg.getToolCalls()).toEqual([]);
    });

    it('should extract tool response output', () => {
      const toolMsg = new ToolMessage({
        content: 'Found matches in 3 file(s):\nsrc/file-reader.ts\nsrc/file-writer.ts\nlib/utils.ts',
        tool_call_id: 'call_123',
      });
      const msg = LangchainMessage(toolMsg);
      const response = msg.getToolResponse();

      expect(response).not.toBeNull();
      expect(response?.output).toContain('Found matches in 3 file(s)');
    });

    it('should return null for non-tool messages', () => {
      const aiMsg = new AIMessage('This is not a tool response');
      const msg = LangchainMessage(aiMsg);

      expect(msg.getToolResponse()).toBeNull();
    });

    it('should extract content', () => {
      const aiMsg = new AIMessage('Based on my search, I found 3 TypeScript files');
      const msg = LangchainMessage(aiMsg);

      expect(msg.getContent()).toContain('Based on my search');
    });
  });

  describe('terminal formatter', () => {
    it('should format AI message with single tool call', () => {
      const aiMsg = new AIMessage({
        content: '',
        tool_calls: [
          {
            name: 'search_content',
            args: {
              pattern: 'import.*fs',
              type: 'ts',
            },
            id: 'call_123',
          },
        ],
      });
      const msg = LangchainMessage(aiMsg);
      const output = msg.terminal();

      expect(output).toContain('🔧');
      expect(output).toContain('search_content');
      expect(output).toContain('pattern');
      expect(output).toContain('import.*fs');
    });

    it('should format AI message with multiple tool calls', () => {
      const aiMsg = new AIMessage({
        content: '',
        tool_calls: [
          {
            name: 'find_files',
            args: { pattern: '**/*.ts' },
            id: 'call_1',
          },
          {
            name: 'search_content',
            args: { pattern: 'import.*fs' },
            id: 'call_2',
          },
        ],
      });
      const msg = LangchainMessage(aiMsg);
      const output = msg.terminal();

      expect(output).toContain('🔧');
      expect(output).toContain('find_files');
      expect(output).toContain('search_content');
    });

    it('should format tool response (short)', () => {
      const toolMsg = new ToolMessage({
        content: 'Found matches in 3 file(s):\nsrc/file-reader.ts\nsrc/file-writer.ts\nlib/utils.ts',
        tool_call_id: 'call_123',
      });
      const msg = LangchainMessage(toolMsg);
      const output = msg.terminal();

      expect(output).toContain('✓');
      expect(output).toContain('Found matches in 3 file(s)');
      expect(output).toContain('src/file-reader.ts');
    });

    it('should format tool response (long, truncated)', () => {
      const longContent = 'A'.repeat(500) + '\nThis is a very long tool response.';
      const toolMsg = new ToolMessage({
        content: longContent,
        tool_call_id: 'call_456',
      });
      const msg = LangchainMessage(toolMsg);
      const output = msg.terminal();

      expect(output).toContain('✓');
      expect(output).toContain('chars');
      expect(output.length).toBeLessThan(longContent.length);
    });

    it('should format AI final response', () => {
      const aiMsg = new AIMessage(
        'Based on my search, I found 3 TypeScript files:\n- src/file-reader.ts\n- src/file-writer.ts\n- lib/utils.ts'
      );
      const msg = LangchainMessage(aiMsg);
      const output = msg.terminal();

      expect(output).toContain('💬');
      expect(output).toContain('Based on my search');
      expect(output).toContain('src/file-reader.ts');
    });

    it('should handle empty content gracefully', () => {
      const aiMsg = new AIMessage('');
      const msg = LangchainMessage(aiMsg);
      const output = msg.terminal();

      expect(output).toBeTruthy();
      expect(output).toContain('💬');
    });
  });
});
