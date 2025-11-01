import { read } from './read';
import { write } from './write';
import { edit } from './edit';
import { grep } from './grep';
import { list } from './list';
import { glob } from './glob';
import type { FileSystem } from '../types';

/**
 * Creates a FileSystem instance bound to a specific workspace
 * @param workspace Absolute path to the workspace root directory
 * @returns FileSystem instance with workspace pre-bound
 */
export function createFileSystem(workspace: string): FileSystem {
  return {
    read: read(workspace),
    write: write(workspace),
    edit: edit(workspace),
    grep: grep(workspace),
    list: list(workspace),
    glob: glob(workspace),
  };
}

// Export individual operations for direct use if needed
export { read, write, edit, glob, grep, list };
