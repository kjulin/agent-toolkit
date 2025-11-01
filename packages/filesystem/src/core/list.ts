import * as fs from 'fs/promises';
import * as path from 'path';
import type { OperationResult, FileInfo, ListOperation } from '../types';

/**
 * List contents of a directory
 * @param workspace Absolute path to the workspace root
 * @returns Curried function that takes relativePath
 */
export const list = (workspace: string) => async (
  relativePath: string = ''
): Promise<OperationResult<FileInfo[]>> => {
  try {
    // Resolve the full path
    const fullPath = path.join(workspace, relativePath);

    // Validate the path is within workspace (security check)
    const normalizedFullPath = path.normalize(fullPath);
    const normalizedWorkspace = path.normalize(workspace);

    if (!normalizedFullPath.startsWith(normalizedWorkspace)) {
      return {
        success: false,
        error: 'Path traversal detected: path must be within workspace',
      };
    }

    // Check if the path exists
    try {
      const stat = await fs.stat(fullPath);

      if (!stat.isDirectory()) {
        return {
          success: false,
          error: `Not a directory: ${relativePath || '.'}`,
        };
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return {
          success: false,
          error: `Directory not found: ${relativePath || '.'}`,
        };
      }
      throw error;
    }

    // Read the directory contents
    const entries = await fs.readdir(fullPath, { withFileTypes: true });

    // Map entries to FileInfo objects
    const fileInfos: FileInfo[] = await Promise.all(
      entries.map(async (entry) => {
        const entryPath = path.join(fullPath, entry.name);
        const stats = await fs.stat(entryPath);

        return {
          name: entry.name,
          path: path.join(relativePath, entry.name),
          isDirectory: entry.isDirectory(),
          size: stats.size,
          modifiedTime: stats.mtime,
        };
      })
    );

    // Sort: directories first, then by name
    fileInfos.sort((a, b) => {
      if (a.isDirectory === b.isDirectory) {
        return a.name.localeCompare(b.name);
      }
      return a.isDirectory ? -1 : 1;
    });

    return {
      success: true,
      data: fileInfos,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to list directory: ${(error as Error).message}`,
    };
  }
};
