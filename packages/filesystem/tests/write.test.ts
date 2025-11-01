import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import * as path from 'path';
import { write } from '../src/core/write';

describe('write', () => {
  let workspacePath: string;
  let writeOp: ReturnType<typeof write>;

  beforeEach(async () => {
    workspacePath = path.join(__dirname, 'workspace', 'write-test', `test-${Date.now()}-${Math.random()}`);
    await fs.mkdir(workspacePath, { recursive: true });
    writeOp = write(workspacePath);
  });

  afterEach(async () => {
    await fs.rm(workspacePath, { recursive: true, force: true });
  });

  describe('basic write operations', () => {
    it('should write content to a new file', async () => {
      const result = await writeOp('new-file.txt', 'Hello, World!');

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();

      const content = await fs.readFile(path.join(workspacePath, 'new-file.txt'), 'utf-8');
      expect(content).toBe('Hello, World!');
    });

    it('should overwrite an existing file', async () => {
      // Create initial file
      await fs.writeFile(path.join(workspacePath, 'existing.txt'), 'Original content', 'utf-8');

      // Overwrite it
      const result = await writeOp('existing.txt', 'New content');

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();

      const content = await fs.readFile(path.join(workspacePath, 'existing.txt'), 'utf-8');
      expect(content).toBe('New content');
    });

    it('should write empty content', async () => {
      const result = await writeOp('empty.txt', '');

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();

      const content = await fs.readFile(path.join(workspacePath, 'empty.txt'), 'utf-8');
      expect(content).toBe('');
    });

    it('should write multiline content', async () => {
      const multilineContent = 'Line 1\nLine 2\nLine 3\n';
      const result = await writeOp('multiline.txt', multilineContent);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();

      const content = await fs.readFile(path.join(workspacePath, 'multiline.txt'), 'utf-8');
      expect(content).toBe(multilineContent);
    });
  });

  describe('directory creation', () => {
    it('should create parent directories if they do not exist', async () => {
      const result = await writeOp(
        'deep/nested/path/file.txt',
        'Content in nested file'
      );

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();

      const content = await fs.readFile(
        path.join(workspacePath, 'deep/nested/path/file.txt'),
        'utf-8'
      );
      expect(content).toBe('Content in nested file');
    });

    it('should handle multiple levels of nested directories', async () => {
      const result = await writeOp(
        'a/b/c/d/e/f/deep-file.txt',
        'Very deep'
      );

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();

      const content = await fs.readFile(
        path.join(workspacePath, 'a/b/c/d/e/f/deep-file.txt'),
        'utf-8'
      );
      expect(content).toBe('Very deep');
    });
  });

  describe('special characters and encoding', () => {
    it('should handle Unicode characters', async () => {
      const unicodeContent = 'Hello 世界! 🌍 Привет مرحبا';
      const result = await writeOp('unicode.txt', unicodeContent);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();

      const content = await fs.readFile(path.join(workspacePath, 'unicode.txt'), 'utf-8');
      expect(content).toBe(unicodeContent);
    });

    it('should handle special characters in content', async () => {
      const specialContent = 'Special chars: <>&"\'`\n\t\r\\';
      const result = await writeOp('special.txt', specialContent);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();

      const content = await fs.readFile(path.join(workspacePath, 'special.txt'), 'utf-8');
      expect(content).toBe(specialContent);
    });

    it('should handle JSON content', async () => {
      const jsonContent = JSON.stringify({ key: 'value', nested: { data: [1, 2, 3] } }, null, 2);
      const result = await writeOp('data.json', jsonContent);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();

      const content = await fs.readFile(path.join(workspacePath, 'data.json'), 'utf-8');
      expect(content).toBe(jsonContent);
    });
  });

  describe('path validation', () => {
    it('should prevent path traversal with ../', async () => {
      const result = await writeOp('../../../etc/passwd', 'malicious');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Path escapes workspace');
    });

    it('should prevent absolute path escapes', async () => {
      const result = await writeOp('/etc/passwd', 'malicious');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Path escapes workspace');
    });

    it('should allow safe relative paths with .. that stay in workspace', async () => {
      // This should work: subdir/../file.txt
      // Resolves to: file.txt
      const result = await writeOp(
        'subdir/../safe-file.txt',
        'Safe content'
      );

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();

      const content = await fs.readFile(path.join(workspacePath, 'safe-file.txt'), 'utf-8');
      expect(content).toBe('Safe content');
    });
  });

  describe('edge cases', () => {
    it('should handle very long content', async () => {
      const longContent = 'A'.repeat(1024 * 1024); // 1MB of 'A's
      const result = await writeOp('large-file.txt', longContent);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();

      const content = await fs.readFile(path.join(workspacePath, 'large-file.txt'), 'utf-8');
      expect(content).toBe(longContent);
    });

    it('should handle files with multiple extensions', async () => {
      const result = await writeOp(
        'file.test.backup.txt',
        'Content'
      );

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();

      const content = await fs.readFile(
        path.join(workspacePath, 'file.test.backup.txt'),
        'utf-8'
      );
      expect(content).toBe('Content');
    });

    it('should handle filenames with spaces', async () => {
      const result = await writeOp(
        'file with spaces.txt',
        'Spaces are OK'
      );

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();

      const content = await fs.readFile(
        path.join(workspacePath, 'file with spaces.txt'),
        'utf-8'
      );
      expect(content).toBe('Spaces are OK');
    });

    it('should handle file without extension', async () => {
      const result = await writeOp('README', 'No extension');

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();

      const content = await fs.readFile(path.join(workspacePath, 'README'), 'utf-8');
      expect(content).toBe('No extension');
    });
  });

  describe('error handling', () => {
    it('should return error for invalid workspace path', async () => {
      const invalidWriteOp = write('/nonexistent/workspace/path');
      const result = await invalidWriteOp('file.txt', 'Content');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(typeof result.error).toBe('string');
    });

    it('should handle read-only scenarios gracefully', async () => {
      // Create a directory
      const readonlyDir = path.join(workspacePath, 'readonly');
      await fs.mkdir(readonlyDir, { recursive: true });

      // Make it read-only
      await fs.chmod(readonlyDir, 0o444);

      const result = await writeOp(
        'readonly/file.txt',
        'Should fail'
      );

      // Restore permissions for cleanup
      await fs.chmod(readonlyDir, 0o755);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('integration with existing workspace', () => {
    it('should write to existing workspace directories', async () => {
      // Create a subdirectory in the workspace
      await fs.mkdir(path.join(workspacePath, 'subdir'), { recursive: true });

      const result = await writeOp('subdir/new-test-file.txt', 'Test content');

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();

      const content = await fs.readFile(
        path.join(workspacePath, 'subdir/new-test-file.txt'),
        'utf-8'
      );
      expect(content).toBe('Test content');
    });

    it('should overwrite existing workspace files safely', async () => {
      // Create an initial file
      await fs.writeFile(path.join(workspacePath, 'empty.txt'), '', 'utf-8');

      const result = await writeOp('empty.txt', 'Temporary content');

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();

      const newContent = await fs.readFile(path.join(workspacePath, 'empty.txt'), 'utf-8');
      expect(newContent).toBe('Temporary content');
    });
  });
});
