import { spawn } from "child_process";
import * as path from "path";
import {
  OperationResult,
  GrepOptions,
  GrepResult,
  GrepContentResult,
  GrepCountResult,
  GrepMatch,
  GrepOperation,
} from "../types";

/**
 * Grep for patterns in files using ripgrep
 * @param workspace Base workspace directory path
 * @returns Curried function that takes grep options
 */
export const grep = (workspace: string) => async (
  options: GrepOptions
): Promise<OperationResult<GrepResult>> => {
  try {
    const { pattern, output_mode = 'files_with_matches' } = options;

    // Validate pattern
    if (!pattern) {
      return {
        success: false,
        error: "pattern is required",
      };
    }

    // Validate pattern is a valid regex
    try {
      new RegExp(pattern);
    } catch (error) {
      return {
        success: false,
        error: `Invalid regex pattern: ${error instanceof Error ? error.message : String(error)}`,
      };
    }

    // Build ripgrep arguments
    const args = buildRipgrepArgs(options, output_mode);

    // Determine search path (relative to workspace)
    const searchPath = options.path
      ? path.join(workspace, options.path)
      : workspace;

    // Validate the search path is within workspace (security)
    const resolvedSearchPath = path.resolve(searchPath);
    const resolvedWorkspace = path.resolve(workspace);
    if (!resolvedSearchPath.startsWith(resolvedWorkspace)) {
      return {
        success: false,
        error: "Search path must be within workspace",
      };
    }

    // Execute ripgrep
    const rgOutput = await executeRipgrep(pattern, searchPath, args);

    // Parse results based on output mode
    const result = parseRipgrepOutput(
      rgOutput,
      output_mode,
      workspace,
      options
    );

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

/**
 * Build ripgrep command line arguments from options
 */
function buildRipgrepArgs(options: GrepOptions, outputMode: string): string[] {
  const args: string[] = [];

  // JSON output for easier parsing (not compatible with --count or --files-with-matches)
  if (outputMode !== "count" && outputMode !== "files_with_matches") {
    args.push("--json");
  }

  // Case insensitive
  if (options["-i"]) {
    args.push("--ignore-case");
  }

  // Multiline mode
  if (options.multiline) {
    args.push("--multiline");
    args.push("--multiline-dotall");
  }

  // Context lines
  if (options["-C"] !== undefined) {
    args.push("-C", String(options["-C"]));
  } else {
    if (options["-B"] !== undefined) {
      args.push("-B", String(options["-B"]));
    }
    if (options["-A"] !== undefined) {
      args.push("-A", String(options["-A"]));
    }
  }

  // Glob pattern
  if (options.glob) {
    args.push("--glob", options.glob);
  }

  // File type
  if (options.type) {
    args.push("--type", options.type);
  }

  // Head limit (max-count per file)
  if (options.head_limit !== undefined) {
    args.push("--max-count", String(options.head_limit));
  }

  // Output mode specific flags
  if (outputMode === "files_with_matches") {
    args.push("--files-with-matches");
  } else if (outputMode === "count") {
    args.push("--count");
  }
  // For content mode, JSON output handles it by default

  return args;
}

/**
 * Execute ripgrep command and return output
 */
function executeRipgrep(
  pattern: string,
  searchPath: string,
  args: string[]
): Promise<string> {
  return new Promise((resolve, reject) => {
    const rg = spawn("rg", [...args, "--", pattern, searchPath]);

    let stdout = "";
    let stderr = "";

    rg.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    rg.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    rg.on("close", (code) => {
      // ripgrep returns:
      // 0 - matches found
      // 1 - no matches found (not an error)
      // 2+ - error occurred
      if (code === 0 || code === 1) {
        resolve(stdout);
      } else {
        reject(new Error(stderr || `ripgrep exited with code ${code}`));
      }
    });

    rg.on("error", (error) => {
      // Handle case where rg is not installed
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        reject(new Error("ripgrep (rg) is not installed or not in PATH"));
      } else {
        reject(error);
      }
    });
  });
}

/**
 * Parse ripgrep JSON output into appropriate result format
 */
function parseRipgrepOutput(
  output: string,
  outputMode: string,
  workspace: string,
  options: GrepOptions
): GrepResult {
  const lines = output.trim().split("\n").filter(line => line.length > 0);

  if (outputMode === "files_with_matches") {
    return parseFilesWithMatches(lines, workspace);
  } else if (outputMode === "count") {
    return parseCountOutput(lines, workspace);
  } else {
    return parseContentOutput(lines, workspace, options);
  }
}

/**
 * Parse files_with_matches output (plain text file paths, one per line)
 */
function parseFilesWithMatches(
  lines: string[],
  workspace: string
): GrepResult {
  const files: string[] = [];

  for (const line of lines) {
    if (line.trim()) {
      // Each line is a file path (may be absolute or relative)
      const absolutePath = path.resolve(workspace, line);
      const relativePath = path.relative(workspace, absolutePath);
      files.push(relativePath);
    }
  }

  return {
    mode: "files_with_matches",
    data: files,
  };
}

/**
 * Parse count output (format: path:count)
 */
function parseCountOutput(lines: string[], workspace: string): GrepResult {
  const results: GrepCountResult[] = [];

  for (const line of lines) {
    // Format is: ./path/to/file.ext:123
    const lastColonIndex = line.lastIndexOf(':');
    if (lastColonIndex === -1) continue;

    const filePath = line.substring(0, lastColonIndex);
    const countStr = line.substring(lastColonIndex + 1);
    const count = parseInt(countStr, 10);

    if (isNaN(count)) continue;

    // Convert absolute path to relative
    const absolutePath = path.resolve(workspace, filePath);
    const relativePath = path.relative(workspace, absolutePath);

    results.push({ path: relativePath, count });
  }

  return {
    mode: "count",
    data: results,
  };
}

/**
 * Parse content output with matches
 */
function parseContentOutput(
  lines: string[],
  workspace: string,
  options: GrepOptions
): GrepResult {
  const fileMap = new Map<string, GrepMatch[]>();
  let currentFile: string | null = null;
  const contextMap = new Map<string, { before: string[]; after: string[] }>();

  for (const line of lines) {
    try {
      const json = JSON.parse(line);

      if (json.type === "begin") {
        const absolutePath = json.data.path.text;
        currentFile = path.relative(workspace, absolutePath);
        if (!fileMap.has(currentFile)) {
          fileMap.set(currentFile, []);
        }
      } else if (json.type === "match" && currentFile) {
        const matchData = json.data;
        const lineNumber = matchData.line_number;
        const lineText = matchData.lines.text.trimEnd();

        // Calculate column (0-indexed in ripgrep, we want 1-indexed)
        const submatches = matchData.submatches || [];
        const column = submatches.length > 0 ? submatches[0].start + 1 : 1;

        const match: GrepMatch = {
          line: lineNumber,
          content: lineText,
        };

        // Only include column if -n option is set or by default
        if (options["-n"] !== false) {
          match.column = column;
        }

        fileMap.get(currentFile)!.push(match);
      } else if (json.type === "context" && currentFile) {
        // Handle context lines (before/after)
        const contextData = json.data;
        const lineNumber = contextData.line_number;
        const lineText = contextData.lines.text.trimEnd();

        // Store context lines for later association with matches
        if (!contextMap.has(currentFile)) {
          contextMap.set(currentFile, { before: [], after: [] });
        }
        // Context handling would require more complex state tracking
        // For simplicity, we're not including it in this implementation
        // unless specifically requested
      }
    } catch {
      // Skip invalid JSON lines
    }
  }

  const results: GrepContentResult[] = [];
  for (const [filePath, matches] of fileMap.entries()) {
    if (matches.length > 0) {
      results.push({
        path: filePath,
        matches,
      });
    }
  }

  return {
    mode: "content",
    data: results,
  };
}
