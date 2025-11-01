import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { promises as fs } from 'fs';
import * as path from 'path';
import { list } from '../src/core/list';

describe('list operation', () => {
  let workspacePath: string;
  let listOp: ReturnType<typeof list>;

  beforeAll(async () => {
    // Create test workspace
    workspacePath = path.join(__dirname, 'workspace', 'list-test');
    await fs.mkdir(workspacePath, { recursive: true });

    // Create test files and directories
    await fs.writeFile(path.join(workspacePath, 'README.md'), '# Test README');
    await fs.writeFile(path.join(workspacePath, 'file1.txt'), 'Content of file1');
    await fs.writeFile(path.join(workspacePath, 'file2.md'), '# Markdown file');

    // Create subdirectory structure
    await fs.mkdir(path.join(workspacePath, 'subdir'), { recursive: true });
    await fs.writeFile(path.join(workspacePath, 'subdir', 'nested.json'), '{"test": true}');
    await fs.writeFile(path.join(workspacePath, 'subdir', 'code.ts'), 'export const x = 1;');

    // Create deeply nested structure
    await fs.mkdir(path.join(workspacePath, 'subdir', 'deep'), { recursive: true });
    await fs.writeFile(path.join(workspacePath, 'subdir', 'deep', 'file.ts'), 'const y = 2;');
    await fs.writeFile(path.join(workspacePath, 'subdir', 'deep', 'data.json'), '{"deep": true}');

    listOp = list(workspacePath);
  });

  afterAll(async () => {
    // Clean up test workspace
    await fs.rm(workspacePath, { recursive: true, force: true });
  });

  it('should list root directory contents', async () => {
    const result = await listOp();

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(Array.isArray(result.data)).toBe(true);

    if (result.data) {
      // Should include expected files and directories
      const names = result.data.map((item) => item.name);
      expect(names).toContain('README.md');
      expect(names).toContain('file1.txt');
      expect(names).toContain('file2.md');
      expect(names).toContain('subdir');

      // Check that directories come first
      const subdirIndex = result.data.findIndex((item) => item.name === 'subdir');
      const file1Index = result.data.findIndex((item) => item.name === 'file1.txt');
      expect(subdirIndex).toBeLessThan(file1Index);
    }
  });

  it('should list subdirectory contents', async () => {
    const result = await listOp('subdir');

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();

    if (result.data) {
      const names = result.data.map((item) => item.name);
      expect(names).toContain('nested.json');
      expect(names).toContain('code.ts');
      expect(names).toContain('deep');
    }
  });

  it('should list deeply nested directory', async () => {
    const result = await listOp('subdir/deep');

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();

    if (result.data) {
      const names = result.data.map((item) => item.name);
      expect(names).toContain('file.ts');
      expect(names).toContain('data.json');
    }
  });

  it('should return FileInfo with correct properties', async () => {
    const result = await listOp();

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();

    if (result.data && result.data.length > 0) {
      const fileInfo = result.data[0];
      expect(fileInfo).toHaveProperty('name');
      expect(fileInfo).toHaveProperty('path');
      expect(fileInfo).toHaveProperty('isDirectory');
      expect(fileInfo).toHaveProperty('size');
      expect(fileInfo).toHaveProperty('modifiedTime');
      expect(fileInfo.modifiedTime).toBeInstanceOf(Date);
    }
  });

  it('should handle non-existent directory', async () => {
    const result = await listOp('nonexistent');

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error).toContain('Directory not found');
  });

  it('should handle path traversal attempts', async () => {
    const result = await listOp('../../../etc');

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error).toContain('Path traversal detected');
  });

  it('should handle listing a file (not a directory)', async () => {
    const result = await listOp('file1.txt');

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error).toContain('Not a directory');
  });

  it('should sort directories before files', async () => {
    const result = await listOp();

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();

    if (result.data) {
      // Find the last directory and first file
      let lastDirIndex = -1;
      let firstFileIndex = -1;

      for (let i = 0; i < result.data.length; i++) {
        if (result.data[i].isDirectory) {
          lastDirIndex = i;
        } else if (firstFileIndex === -1) {
          firstFileIndex = i;
        }
      }

      // If we have both directories and files, dirs should come first
      if (lastDirIndex !== -1 && firstFileIndex !== -1) {
        expect(lastDirIndex).toBeLessThan(firstFileIndex);
      }
    }
  });

  it('should return relative paths correctly', async () => {
    const result = await listOp('subdir');

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();

    if (result.data) {
      // All paths should be relative to workspace and include 'subdir'
      result.data.forEach((item) => {
        expect(item.path).toMatch(/^subdir/);
      });
    }
  });
});
