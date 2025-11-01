import { promises as fs } from 'fs';
import * as path from 'path';
import type { OperationResult, WriteOperation } from '../types';

/**
 * Validates that a path is safe (doesn't escape workspace)
 */
function validatePath(workspace: string, relativePath: string): string {
  const absolutePath = path.resolve(workspace, relativePath);
  const normalizedWorkspace = path.resolve(workspace);

  if (!absolutePath.startsWith(normalizedWorkspace)) {
    throw new Error('Path escapes workspace');
  }

  return absolutePath;
}

/**
 * Write content to a file (creates or overwrites)
 * Creates parent directories if they don't exist
 *
 * @param workspace Absolute path to workspace directory
 * @returns Curried function that takes relativePath and content
 */
export const write = (workspace: string) => async (
  relativePath: string,
  content: string
): Promise<OperationResult<void>> => {
  try {
    // Validate and resolve the path
    const absolutePath = validatePath(workspace, relativePath);

    // Create parent directories if they don't exist
    const dirname = path.dirname(absolutePath);
    await fs.mkdir(dirname, { recursive: true });

    // Write the file
    await fs.writeFile(absolutePath, content, 'utf-8');

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};
