import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { edit } from '../src/core/edit';

describe('edit', () => {
  const workspacePath = path.join(__dirname, 'workspace', 'edit-test');
  let editOp: ReturnType<typeof edit>;
  let testFilePath: string;
  let testContent: string;

  beforeEach(async () => {
    // Create clean test workspace
    await fs.mkdir(workspacePath, { recursive: true });
    await fs.mkdir(path.join(workspacePath, 'subdir'), { recursive: true });

    // Initialize edit operation with workspace
    editOp = edit(workspacePath);

    // Create a temporary test file
    testFilePath = 'test-edit-temp.txt';
    testContent = 'Hello World!\nThis is a test file.\nHello again!';
    await fs.writeFile(path.join(workspacePath, testFilePath), testContent, 'utf-8');
  });

  afterEach(async () => {
    // Clean up test workspace
    try {
      await fs.rm(workspacePath, { recursive: true, force: true });
    } catch (error) {
      // Ignore if directory doesn't exist
    }
  });

  describe('successful edits', () => {
    it('should replace first occurrence of a string', async () => {
      await fs.writeFile(
        path.join(workspacePath, testFilePath),
        'Hello World!\nThis is a test file.\nGoodbye!',
        'utf-8'
      );

      const result = await editOp(testFilePath, 'Hello', 'Hi');

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();

      const content = await fs.readFile(path.join(workspacePath, testFilePath), 'utf-8');
      expect(content).toBe('Hi World!\nThis is a test file.\nGoodbye!');
    });

    it('should replace all occurrences when replaceAll is true', async () => {
      const result = await editOp(testFilePath, 'Hello', 'Hi', { replaceAll: true });

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();

      const content = await fs.readFile(path.join(workspacePath, testFilePath), 'utf-8');
      expect(content).toBe('Hi World!\nThis is a test file.\nHi again!');
    });

    it('should replace multiline strings', async () => {
      const result = await editOp(
        testFilePath,
        'Hello World!\nThis is a test file.',
        'Greetings!\nThis is modified content.'
      );

      expect(result.success).toBe(true);

      const content = await fs.readFile(path.join(workspacePath, testFilePath), 'utf-8');
      expect(content).toBe('Greetings!\nThis is modified content.\nHello again!');
    });

    it('should handle replacement with empty string', async () => {
      const result = await editOp( testFilePath, 'Hello World!\n', '');

      expect(result.success).toBe(true);

      const content = await fs.readFile(path.join(workspacePath, testFilePath), 'utf-8');
      expect(content).toBe('This is a test file.\nHello again!');
    });

    it('should work with existing workspace files', async () => {
      // Create a test file with content to edit
      await fs.writeFile(
        path.join(workspacePath, 'file1.txt'),
        'This file contains FINDME text',
        'utf-8'
      );

      const result = await editOp('file1.txt', 'FINDME', 'REPLACED');

      expect(result.success).toBe(true);

      const content = await fs.readFile(path.join(workspacePath, 'file1.txt'), 'utf-8');
      expect(content).toContain('REPLACED');
      expect(content).not.toContain('FINDME');
    });

    it('should replace special characters', async () => {
      await fs.writeFile(
        path.join(workspacePath, testFilePath),
        'Price: $100.00',
        'utf-8'
      );

      const result = await editOp( testFilePath, '$100.00', '$150.00');

      expect(result.success).toBe(true);

      const content = await fs.readFile(path.join(workspacePath, testFilePath), 'utf-8');
      expect(content).toBe('Price: $150.00');
    });

    it('should handle files in subdirectories', async () => {
      const subFilePath = 'subdir/test-nested.txt';
      await fs.writeFile(
        path.join(workspacePath, subFilePath),
        'Nested content',
        'utf-8'
      );

      const result = await editOp( subFilePath, 'Nested', 'Modified');

      expect(result.success).toBe(true);

      const content = await fs.readFile(path.join(workspacePath, subFilePath), 'utf-8');
      expect(content).toBe('Modified content');
    });
  });

  describe('error cases', () => {
    it('should fail when file does not exist', async () => {
      const result = await editOp( 'nonexistent.txt', 'old', 'new');

      expect(result.success).toBe(false);
      expect(result.error).toContain('File not found');
    });

    it('should fail when relative path is empty', async () => {
      const result = await editOp( '', 'old', 'new');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Relative path is required');
    });

    it('should fail when old string is empty', async () => {
      const result = await editOp( testFilePath, '', 'new');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Old string cannot be empty');
    });

    it('should fail when old string equals new string', async () => {
      const result = await editOp( testFilePath, 'same', 'same');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Old string and new string are identical');
    });

    it('should fail when old string is not found', async () => {
      const result = await editOp( testFilePath, 'NOTFOUND', 'new');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Old string not found in file');
    });

    it('should fail when multiple occurrences exist and replaceAll is false', async () => {
      const result = await editOp( testFilePath, 'Hello', 'Hi', { replaceAll: false });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Multiple occurrences found');
    });

    it('should fail when trying to edit a directory', async () => {
      const result = await editOp( 'subdir', 'old', 'new');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Path is a directory');
    });

    it('should fail with path traversal attempt', async () => {
      const result = await editOp( '../../../etc/passwd', 'old', 'new');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Path traversal detected');
    });
  });

  describe('edge cases', () => {
    it('should handle single occurrence correctly', async () => {
      await fs.writeFile(
        path.join(workspacePath, testFilePath),
        'Single occurrence of WORD here',
        'utf-8'
      );

      const result = await editOp( testFilePath, 'WORD', 'REPLACED');

      expect(result.success).toBe(true);

      const content = await fs.readFile(path.join(workspacePath, testFilePath), 'utf-8');
      expect(content).toBe('Single occurrence of REPLACED here');
    });

    it('should handle replacement at start of file', async () => {
      await fs.writeFile(
        path.join(workspacePath, testFilePath),
        'Start of file content',
        'utf-8'
      );

      const result = await editOp( testFilePath, 'Start', 'Beginning');

      expect(result.success).toBe(true);

      const content = await fs.readFile(path.join(workspacePath, testFilePath), 'utf-8');
      expect(content).toBe('Beginning of file content');
    });

    it('should handle replacement at end of file', async () => {
      await fs.writeFile(
        path.join(workspacePath, testFilePath),
        'Content at the end',
        'utf-8'
      );

      const result = await editOp( testFilePath, 'end', 'finish');

      expect(result.success).toBe(true);

      const content = await fs.readFile(path.join(workspacePath, testFilePath), 'utf-8');
      expect(content).toBe('Content at the finish');
    });

    it('should handle replacing entire file content', async () => {
      await fs.writeFile(
        path.join(workspacePath, testFilePath),
        'Replace me entirely',
        'utf-8'
      );

      const result = await editOp( testFilePath, 'Replace me entirely', 'New content');

      expect(result.success).toBe(true);

      const content = await fs.readFile(path.join(workspacePath, testFilePath), 'utf-8');
      expect(content).toBe('New content');
    });

    it('should handle unicode characters', async () => {
      await fs.writeFile(
        path.join(workspacePath, testFilePath),
        'Hello 世界 🌍',
        'utf-8'
      );

      const result = await editOp( testFilePath, '世界', 'World');

      expect(result.success).toBe(true);

      const content = await fs.readFile(path.join(workspacePath, testFilePath), 'utf-8');
      expect(content).toBe('Hello World 🌍');
    });

    it('should handle newline characters correctly', async () => {
      await fs.writeFile(
        path.join(workspacePath, testFilePath),
        'Line 1\nLine 2\nLine 3',
        'utf-8'
      );

      const result = await editOp( testFilePath, '\n', ' | ');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Multiple occurrences found');
    });

    it('should replace multiple newlines with replaceAll', async () => {
      await fs.writeFile(
        path.join(workspacePath, testFilePath),
        'Line 1\nLine 2\nLine 3',
        'utf-8'
      );

      const result = await editOp( testFilePath, '\n', ' | ', { replaceAll: true });

      expect(result.success).toBe(true);

      const content = await fs.readFile(path.join(workspacePath, testFilePath), 'utf-8');
      expect(content).toBe('Line 1 | Line 2 | Line 3');
    });
  });

  describe('replaceAll behavior', () => {
    it('should replace all occurrences when string appears 3 times', async () => {
      await fs.writeFile(
        path.join(workspacePath, testFilePath),
        'foo bar foo baz foo',
        'utf-8'
      );

      const result = await editOp( testFilePath, 'foo', 'qux', { replaceAll: true });

      expect(result.success).toBe(true);

      const content = await fs.readFile(path.join(workspacePath, testFilePath), 'utf-8');
      expect(content).toBe('qux bar qux baz qux');
    });

    it('should work with replaceAll even if only one occurrence exists', async () => {
      await fs.writeFile(
        path.join(workspacePath, testFilePath),
        'Single word here',
        'utf-8'
      );

      const result = await editOp( testFilePath, 'word', 'item', { replaceAll: true });

      expect(result.success).toBe(true);

      const content = await fs.readFile(path.join(workspacePath, testFilePath), 'utf-8');
      expect(content).toBe('Single item here');
    });

    it('should handle overlapping substrings with replaceAll', async () => {
      await fs.writeFile(
        path.join(workspacePath, testFilePath),
        'aaaa',
        'utf-8'
      );

      const result = await editOp( testFilePath, 'aa', 'b', { replaceAll: true });

      expect(result.success).toBe(true);

      const content = await fs.readFile(path.join(workspacePath, testFilePath), 'utf-8');
      // Note: split/join replacement is non-overlapping, so 'aaaa' -> 'bb'
      expect(content).toBe('bb');
    });
  });
});
