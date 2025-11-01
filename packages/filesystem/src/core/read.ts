import * as fs from 'fs/promises';
import * as path from 'path';
import type { OperationResult, ReadOperation } from '../types';

/**
 * Validates that the resolved path is within the workspace directory
 * to prevent path traversal attacks
 */
function isPathSafe(workspace: string, resolvedPath: string): boolean {
  const normalizedWorkspace = path.resolve(workspace);
  const normalizedPath = path.resolve(resolvedPath);
  return normalizedPath.startsWith(normalizedWorkspace + path.sep) ||
         normalizedPath === normalizedWorkspace;
}

/**
 * Reads a file from the workspace
 * @param workspace The workspace root directory
 * @returns Curried function that takes relativePath
 */
export const read = (workspace: string) => async (
  relativePath: string
): Promise<OperationResult<string>> => {
  try {
    // Check for absolute paths (security risk)
    if (path.isAbsolute(relativePath)) {
      return {
        success: false,
        error: `Path traversal detected: ${relativePath} is outside workspace`
      };
    }

    // Resolve the full path
    const fullPath = path.join(workspace, relativePath);

    // Security check: ensure path is within workspace
    if (!isPathSafe(workspace, fullPath)) {
      return {
        success: false,
        error: `Path traversal detected: ${relativePath} is outside workspace`
      };
    }

    // Check if file exists
    try {
      const stats = await fs.stat(fullPath);
      if (!stats.isFile()) {
        return {
          success: false,
          error: `Path is not a file: ${relativePath}`
        };
      }
    } catch (err) {
      return {
        success: false,
        error: `File not found: ${relativePath}`
      };
    }

    // Read the file
    const content = await fs.readFile(fullPath, 'utf-8');

    return {
      success: true,
      data: content
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error occurred'
    };
  }
};
