import { promises as fs } from 'fs';
import path from 'path';
import type {
  OperationResult,
  EditOptions,
  EditOperation,
} from '../types';

/**
 * Edit a file by replacing a substring
 * @param workspace The workspace root directory
 * @returns Curried function that takes file path and edit parameters
 */
export const edit = (workspace: string) => async (
  relativePath: string,
  oldString: string,
  newString: string,
  options?: EditOptions
): Promise<OperationResult<void>> => {
  try {
    // Validate inputs
    if (!relativePath) {
      return {
        success: false,
        error: 'Relative path is required',
      };
    }

    if (!oldString) {
      return {
        success: false,
        error: 'Old string cannot be empty',
      };
    }

    if (oldString === newString) {
      return {
        success: false,
        error: 'Old string and new string are identical',
      };
    }

    // Resolve the full path and ensure it's within workspace
    const fullPath = path.resolve(workspace, relativePath);

    // Security check: ensure path is within workspace
    if (!fullPath.startsWith(path.resolve(workspace))) {
      return {
        success: false,
        error: 'Path traversal detected - path must be within workspace',
      };
    }

    // Read the file
    let content: string;
    try {
      content = await fs.readFile(fullPath, 'utf-8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return {
          success: false,
          error: `File not found: ${relativePath}`,
        };
      }
      if ((error as NodeJS.ErrnoException).code === 'EISDIR') {
        return {
          success: false,
          error: `Path is a directory, not a file: ${relativePath}`,
        };
      }
      throw error;
    }

    // Check if oldString exists in content
    if (!content.includes(oldString)) {
      return {
        success: false,
        error: 'Old string not found in file',
      };
    }

    // Perform replacement
    let newContent: string;
    if (options?.replaceAll) {
      // Replace all occurrences
      newContent = content.split(oldString).join(newString);
    } else {
      // Replace only the first occurrence
      const index = content.indexOf(oldString);
      newContent = content.substring(0, index) + newString + content.substring(index + oldString.length);

      // Check if there are multiple occurrences
      const remainingContent = content.substring(index + oldString.length);
      if (remainingContent.includes(oldString)) {
        return {
          success: false,
          error: 'Multiple occurrences found. Use replaceAll option to replace all occurrences.',
        };
      }
    }

    // Write the modified content back
    await fs.writeFile(fullPath, newContent, 'utf-8');

    return {
      success: true,
      data: undefined,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
};
