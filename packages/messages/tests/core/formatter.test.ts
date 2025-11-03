import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { formatMessage } from '../../src/core/formatter';
import type { Message } from '../../src/core/types';

describe('Formatter output', () => {
  it('should match expected terminal output from fixtures', () => {
    // Read input messages
    const inputPath = join(__dirname, 'input.json');
    const inputContent = readFileSync(inputPath, 'utf-8');
    const messages: Message[] = JSON.parse(inputContent);

    // Read expected output
    const outputPath = join(__dirname, 'output.txt');
    const expectedOutput = readFileSync(outputPath, 'utf-8').trim();

    // Format all messages and concatenate
    const actualOutputs = messages.map(msg => formatMessage(msg).terminal());
    const actualOutput = actualOutputs.join('\n\n').trim();

    // Compare
    expect(actualOutput).toBe(expectedOutput);
  });

  it('should format individual messages correctly', () => {
    // Read input messages
    const inputPath = join(__dirname, 'input.json');
    const inputContent = readFileSync(inputPath, 'utf-8');
    const messages: Message[] = JSON.parse(inputContent);

    // Verify we have expected number of messages
    expect(messages).toHaveLength(5);

    // Verify first message (AI with tool call)
    const firstFormatter = formatMessage(messages[0]);
    expect(firstFormatter.isAI()).toBe(true);
    expect(firstFormatter.isToolCall()).toBe(true);
    expect(firstFormatter.terminal()).toContain('🔧');
    expect(firstFormatter.terminal()).toContain('search_content');

    // Verify second message (tool response)
    const secondFormatter = formatMessage(messages[1]);
    expect(secondFormatter.isTool()).toBe(true);
    expect(secondFormatter.isToolResponse()).toBe(true);
    expect(secondFormatter.terminal()).toContain('✓');
    expect(secondFormatter.terminal()).toContain('search_content');

    // Verify third message (AI with multiple tool calls)
    const thirdFormatter = formatMessage(messages[2]);
    expect(thirdFormatter.isToolCall()).toBe(true);
    expect(thirdFormatter.getToolCalls()).toHaveLength(2);

    // Verify fourth message (error tool response)
    const fourthFormatter = formatMessage(messages[3]);
    expect(fourthFormatter.terminal()).toContain('❌');
    expect(fourthFormatter.terminal()).toContain('Error:');

    // Verify fifth message (final AI response)
    const fifthFormatter = formatMessage(messages[4]);
    expect(fifthFormatter.isAI()).toBe(true);
    expect(fifthFormatter.isToolCall()).toBe(false);
    expect(fifthFormatter.terminal()).toContain('💬');
  });

  it('should exclude original field from raw() output', () => {
    const originalMessage = {
      id: 'test-123',
      someField: 'some value',
    };

    const message: Message = {
      type: 'ai',
      content: 'Test message',
      original: originalMessage,
    };

    const formatter = formatMessage(message);
    const raw = formatter.raw();
    const parsed = JSON.parse(raw);

    // Should have the message fields
    expect(parsed.type).toBe('ai');
    expect(parsed.content).toBe('Test message');

    // Should NOT have the original field
    expect(parsed.original).toBeUndefined();
  });

  it('should return original message from original() method', () => {
    const originalMessage = {
      id: 'test-123',
      someField: 'some value',
      nested: {
        key: 'value',
      },
    };

    const message: Message = {
      type: 'ai',
      content: 'Test message',
      original: originalMessage,
    };

    const formatter = formatMessage(message);
    const original = formatter.original();
    const parsed = JSON.parse(original);

    // Should match the original message exactly
    expect(parsed).toEqual(originalMessage);
    expect(parsed.id).toBe('test-123');
    expect(parsed.someField).toBe('some value');
    expect(parsed.nested.key).toBe('value');
  });

  it('should handle message without original field', () => {
    const message: Message = {
      type: 'ai',
      content: 'Test message',
    };

    const formatter = formatMessage(message);
    const original = formatter.original();

    // Should return null when original is undefined
    expect(original).toBe('null');
  });
});
