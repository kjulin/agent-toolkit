import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { createFileSystem } from '../../core/index';
import type { FileSystem } from '../../types';

/**
 * Available filesystem tool names
 */
export type FileSystemToolName = 'read' | 'write' | 'edit' | 'list' | 'glob' | 'grep';

/**
 * Options for creating LangChain filesystem tools
 */
export interface CreateLangchainFileSystemToolsOptions {
  /** Workspace root directory path */
  workspace: string;
  /** Optional array of tool names to include. If not specified, all tools are included. */
  tools?: FileSystemToolName[];
}

/**
 * Create LangChain filesystem tools
 * @param options Configuration options
 * @returns Array of LangChain DynamicStructuredTool instances
 */
export function createLangchainFileSystemTools(
  options: CreateLangchainFileSystemToolsOptions
): DynamicStructuredTool[] {
  const { workspace, tools: selectedTools } = options;
  const fs = createFileSystem(workspace);

  // Define all available tools
  const allTools: Record<FileSystemToolName, DynamicStructuredTool> = {
    read: createReadTool(fs),
    write: createWriteTool(fs),
    edit: createEditTool(fs),
    list: createListTool(fs),
    glob: createGlobTool(fs),
    grep: createGrepTool(fs),
  };

  // Filter tools based on selection
  if (selectedTools && selectedTools.length > 0) {
    return selectedTools.map((toolName) => allTools[toolName]);
  }

  // Return all tools if no selection specified
  return Object.values(allTools);
}

/**
 * Read tool - reads file contents
 */
function createReadTool(fs: FileSystem): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: 'read_file',
    description: 'Read the contents of a file at the specified path relative to the workspace root.',
    schema: z.object({
      path: z.string().describe('The relative path to the file to read'),
    }),
    func: async ({ path }: { path: string }) => {
      const result = await fs.read(path);
      if (!result.success) {
        return `Error: ${result.error || 'Failed to read file'}`;
      }
      return result.data || '';
    },
  });
}

/**
 * Write tool - writes content to a file
 */
function createWriteTool(fs: FileSystem): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: 'write_file',
    description:
      'Write content to a file at the specified path. Creates the file if it does not exist, or overwrites it if it does. Parent directories are created automatically.',
    schema: z.object({
      path: z.string().describe('The relative path to the file to write'),
      content: z.string().describe('The content to write to the file'),
    }),
    func: async ({ path, content }: { path: string; content: string }) => {
      const result = await fs.write(path, content);
      if (!result.success) {
        return `Error: ${result.error || 'Failed to write file'}`;
      }
      return `Successfully wrote to ${path}`;
    },
  });
}

/**
 * Edit tool - replaces a substring in a file
 */
function createEditTool(fs: FileSystem): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: 'edit_file',
    description:
      'Edit a file by replacing a specific substring with new content. This is more token-efficient than rewriting the entire file. Use replaceAll to replace all occurrences.',
    schema: z.object({
      path: z.string().describe('The relative path to the file to edit'),
      oldString: z.string().describe('The exact string to find and replace'),
      newString: z.string().describe('The new string to replace with'),
      replaceAll: z
        .boolean()
        .optional()
        .describe('If true, replace all occurrences. If false (default), only replace if exactly one occurrence exists.'),
    }),
    func: async ({ path, oldString, newString, replaceAll }: { path: string; oldString: string; newString: string; replaceAll?: boolean }) => {
      const result = await fs.edit(path, oldString, newString, { replaceAll });
      if (!result.success) {
        return `Error: ${result.error || 'Failed to edit file'}`;
      }
      return `Successfully edited ${path}`;
    },
  });
}

/**
 * List tool - lists directory contents
 */
function createListTool(fs: FileSystem): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: 'list_directory',
    description:
      'List the contents of a directory, showing files and subdirectories with their metadata (name, size, modified time, type).',
    schema: z.object({
      path: z
        .string()
        .optional()
        .describe('The relative path to the directory to list. Defaults to workspace root if not specified.'),
    }),
    func: async ({ path }: { path?: string }) => {
      const result = await fs.list(path);
      if (!result.success) {
        return `Error: ${result.error || 'Failed to list directory'}`;
      }

      const items = result.data || [];
      if (items.length === 0) {
        return 'Directory is empty';
      }

      // Format output as a readable list
      return items
        .map((item) => {
          const type = item.isDirectory ? 'DIR ' : 'FILE';
          const size = item.isDirectory ? '' : ` (${item.size} bytes)`;
          return `${type} ${item.name}${size}`;
        })
        .join('\n');
    },
  });
}

/**
 * Glob tool - finds files matching a pattern
 */
function createGlobTool(fs: FileSystem): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: 'find_files',
    description:
      'Find files matching a glob pattern. Supports wildcards: * (any characters except /), ** (any characters including /), ? (single character), [abc] (character class).',
    schema: z.object({
      pattern: z.string().describe('The glob pattern to match files against (e.g., "**/*.ts", "src/**/*.test.js")'),
      path: z
        .string()
        .optional()
        .describe('Optional directory to search in. Defaults to workspace root.'),
    }),
    func: async ({ pattern, path }: { pattern: string; path?: string }) => {
      const result = await fs.glob(pattern, path);
      if (!result.success) {
        return `Error: ${result.error || 'Failed to find files'}`;
      }

      const files = result.data || [];
      if (files.length === 0) {
        return `No files found matching pattern: ${pattern}`;
      }

      return `Found ${files.length} file(s):\n${files.join('\n')}`;
    },
  });
}

/**
 * Grep tool - searches file contents
 */
function createGrepTool(fs: FileSystem): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: 'search_content',
    description:
      'Search for a pattern in file contents using ripgrep. Supports regex patterns, context lines, and various output modes. Very powerful for finding specific code or text. To search multiple directories, call this tool multiple times.',
    schema: z.object({
      pattern: z.string().describe('The regular expression pattern to search for'),
      path: z.string().optional().describe('Single file or directory to search in (not comma-separated). Defaults to workspace root which searches all files.'),
      glob: z.string().optional().describe('Glob pattern to filter files (e.g., "*.js")'),
      type: z.string().optional().describe('File type to search (e.g., "js", "py", "rust")'),
      outputMode: z
        .enum(['content', 'files_with_matches', 'count'])
        .optional()
        .describe('Output mode: "content" shows matching lines, "files_with_matches" shows file paths, "count" shows match counts'),
      caseInsensitive: z.boolean().optional().describe('Perform case-insensitive search'),
      showLineNumbers: z.boolean().optional().describe('Show line numbers in output (content mode only)'),
      contextBefore: z.number().optional().describe('Number of lines to show before each match'),
      contextAfter: z.number().optional().describe('Number of lines to show after each match'),
      headLimit: z.number().optional().describe('Limit output to first N results'),
      multiline: z.boolean().optional().describe('Enable multiline mode where patterns can span lines'),
    }),
    func: async ({
      pattern,
      path,
      glob,
      type,
      outputMode,
      caseInsensitive,
      showLineNumbers,
      contextBefore,
      contextAfter,
      headLimit,
      multiline,
    }: {
      pattern: string;
      path?: string;
      glob?: string;
      type?: string;
      outputMode?: 'content' | 'files_with_matches' | 'count';
      caseInsensitive?: boolean;
      showLineNumbers?: boolean;
      contextBefore?: number;
      contextAfter?: number;
      headLimit?: number;
      multiline?: boolean;
    }) => {
      const result = await fs.grep({
        pattern,
        path,
        glob,
        type,
        output_mode: outputMode,
        '-i': caseInsensitive,
        '-n': showLineNumbers,
        '-B': contextBefore,
        '-A': contextAfter,
        head_limit: headLimit,
        multiline,
      });

      if (!result.success) {
        return `Error: ${result.error || 'Failed to search content'}`;
      }

      const grepResult = result.data;
      if (!grepResult) {
        return 'No matches found';
      }

      // Format output based on mode
      if (grepResult.mode === 'files_with_matches') {
        const files = grepResult.data;
        if (files.length === 0) {
          return 'No matches found';
        }
        return `Found matches in ${files.length} file(s):\n${files.join('\n')}`;
      }

      if (grepResult.mode === 'count') {
        const counts = grepResult.data;
        if (counts.length === 0) {
          return 'No matches found';
        }
        return counts.map((c) => `${c.path}: ${c.count} match(es)`).join('\n');
      }

      if (grepResult.mode === 'content') {
        const contents = grepResult.data;
        if (contents.length === 0) {
          return 'No matches found';
        }

        return contents
          .map((file) => {
            const matches = file.matches
              .map((match) => {
                let output = `  Line ${match.line}: ${match.content}`;
                if (match.beforeContext) {
                  output = match.beforeContext.map((line) => `  ${line}`).join('\n') + '\n' + output;
                }
                if (match.afterContext) {
                  output = output + '\n' + match.afterContext.map((line) => `  ${line}`).join('\n');
                }
                return output;
              })
              .join('\n');
            return `${file.path}:\n${matches}`;
          })
          .join('\n\n');
      }

      return 'No matches found';
    },
  });
}
