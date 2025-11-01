import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { promises as fs } from 'fs';
import * as path from 'path';
import { read } from '../src/core/read';

describe('read operation', () => {
  let workspacePath: string;
  let readOp: ReturnType<typeof read>;

  beforeAll(async () => {
    // Create test workspace
    workspacePath = path.join(__dirname, 'workspace', 'read-test');
    await fs.mkdir(workspacePath, { recursive: true });

    // Create test files
    await fs.writeFile(path.join(workspacePath, 'file1.txt'), 'Hello World!\nThis is a simple text file.\nIt contains multiple lines.\nLine four has the word FINDME in it.\nAnd this is the last line.\n');
    await fs.writeFile(path.join(workspacePath, 'special-chars.txt'), 'File with special characters:\nÉmojis: 🚀 🎉 🔥\nSymbols: @#$%^&*()\nQuotes: "double" and \'single\'\nUnicode: こんにちは 世界\n');
    await fs.writeFile(path.join(workspacePath, 'empty.txt'), '');
    await fs.writeFile(path.join(workspacePath, 'large.txt'), 'a'.repeat(10000));

    // Create subdirectory with files
    await fs.mkdir(path.join(workspacePath, 'subdir'), { recursive: true });
    await fs.writeFile(path.join(workspacePath, 'subdir', 'nested.json'), '{"test": true}');
    await fs.mkdir(path.join(workspacePath, 'subdir', 'deep'), { recursive: true });
    await fs.writeFile(path.join(workspacePath, 'subdir', 'deep', 'file.ts'), 'const x = 1;');

    readOp = read(workspacePath);
  });

  afterAll(async () => {
    // Clean up test workspace
    await fs.rm(workspacePath, { recursive: true, force: true });
  });

  describe('successful reads', () => {
    it('should read a simple text file', async () => {
      const result = await readOp('file1.txt');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data).toContain('Hello World!');
      expect(result.data).toContain('FINDME');
      expect(result.error).toBeUndefined();
    });

    it('should read a file with special characters and unicode', async () => {
      const result = await readOp('special-chars.txt');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data).toContain('🚀');
      expect(result.data).toContain('🎉');
      expect(result.data).toContain('こんにちは');
      expect(result.data).toContain('@#$%^&*()');
    });

    it('should read empty files', async () => {
      const result = await readOp('empty.txt');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data).toBe('');
    });

    it('should read large files', async () => {
      const result = await readOp('large.txt');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.length).toBe(10000);
    });

    it('should read files in subdirectories', async () => {
      const result = await readOp('subdir/nested.json');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data).toContain('"test"');
    });

    it('should read deeply nested files', async () => {
      const result = await readOp('subdir/deep/file.ts');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data).toContain('const x');
    });
  });

  describe('error cases', () => {
    it('should fail when file does not exist', async () => {
      const result = await readOp('nonexistent.txt');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('File not found');
    });

    it('should fail when trying to read a directory', async () => {
      const result = await readOp('subdir');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('not a file');
    });

    it('should fail with absolute path', async () => {
      const result = await readOp('/etc/hosts');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Path traversal detected');
    });

    it('should fail with path traversal attempt', async () => {
      const result = await readOp('../../../etc/passwd');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Path traversal detected');
    });

    it('should fail with relative path that escapes workspace', async () => {
      const result = await readOp('subdir/../../outside.txt');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Path traversal detected');
    });
  });

  describe('content validation', () => {
    it('should preserve line breaks in multi-line files', async () => {
      const result = await readOp('file1.txt');

      expect(result.success).toBe(true);
      const lines = result.data!.split('\n');
      expect(lines.length).toBeGreaterThan(1);
    });

    it('should preserve exact file content without modification', async () => {
      const result1 = await readOp('file1.txt');
      const result2 = await readOp('file1.txt');

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.data).toBe(result2.data);
    });
  });
});
