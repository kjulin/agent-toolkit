import * as fs from "fs/promises";
import * as path from "path";
import { OperationResult, GlobOperation } from "../types";

/**
 * Find files matching a glob pattern
 * @param workspace Base workspace directory path
 * @returns Curried function that takes pattern and optional path
 */
export const glob = (workspace: string) => async (
  pattern: string,
  searchPath?: string
): Promise<OperationResult<string[]>> => {
  try {
    // Validate that pattern is provided
    if (!pattern) {
      return {
        success: false,
        error: "Pattern is required",
      };
    }

    // Determine the base search directory
    const basePath = searchPath ? path.join(workspace, searchPath) : workspace;

    // Validate the path is within workspace (security check)
    const normalizedBasePath = path.normalize(basePath);
    const normalizedWorkspace = path.normalize(workspace);

    if (!normalizedBasePath.startsWith(normalizedWorkspace)) {
      return {
        success: false,
        error: "Path traversal detected: path must be within workspace",
      };
    }

    // Check if the base path exists
    try {
      const stat = await fs.stat(basePath);

      if (!stat.isDirectory()) {
        return {
          success: false,
          error: `Not a directory: ${searchPath || "."}`,
        };
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return {
          success: false,
          error: `Directory not found: ${searchPath || "."}`,
        };
      }
      throw error;
    }

    // Collect all files recursively
    const allFiles = await collectFiles(basePath, workspace);

    // Convert glob pattern to regex
    const regex = globToRegex(pattern);

    // Filter files that match the pattern
    const matchedFiles = allFiles.filter((file) => {
      // Match pattern against path relative to the search directory (basePath)
      const relativeToSearch = path.relative(basePath, file);
      // Normalize path separators for cross-platform compatibility
      const normalizedPath = relativeToSearch.split(path.sep).join("/");
      return regex.test(normalizedPath);
    });

    // Convert to relative paths
    const results = matchedFiles.map((file) => path.relative(workspace, file));

    // Sort results for consistent output
    results.sort();

    return {
      success: true,
      data: results,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

/**
 * Recursively collect all files in a directory
 * @param dirPath Directory to search
 * @param basePath Base path for relative calculations
 * @returns Array of absolute file paths
 */
async function collectFiles(
  dirPath: string,
  basePath: string
): Promise<string[]> {
  const files: string[] = [];

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        // Recursively collect files from subdirectories
        const subFiles = await collectFiles(fullPath, basePath);
        files.push(...subFiles);
      } else if (entry.isFile()) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    // Skip directories that cannot be read
    console.error(`Error reading directory ${dirPath}:`, error);
  }

  return files;
}

/**
 * Convert glob pattern to RegExp
 * Supports: *, **, ?, [abc], {a,b,c}
 * @param pattern Glob pattern
 * @returns RegExp object
 */
function globToRegex(pattern: string): RegExp {
  // Normalize pattern to use forward slashes
  pattern = pattern.split(path.sep).join("/");

  // Escape special regex characters, but preserve * and ? temporarily
  let regexPattern = "";
  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i];
    if (char === "*") {
      // Check for **
      if (i + 1 < pattern.length && pattern[i + 1] === "*") {
        // Check if this is **/ (matches zero or more path segments)
        if (i + 2 < pattern.length && pattern[i + 2] === "/") {
          // **/ matches zero or more directories
          // This should match: "", "foo/", "foo/bar/", etc.
          regexPattern += "(?:.*/)?";
          i += 2; // Skip the second * and the /
        } else {
          // ** at the end or followed by non-/ character
          regexPattern += ".*";
          i++; // Skip the second *
        }
      } else {
        // Single * matches anything except path separator
        regexPattern += "[^/]*";
      }
    } else if (char === "?") {
      regexPattern += "[^/]";
    } else if (/[.+^${}()|[\]\\]/.test(char)) {
      regexPattern += "\\" + char;
    } else {
      regexPattern += char;
    }
  }

  return new RegExp(`^${regexPattern}$`);
}
