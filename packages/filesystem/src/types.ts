/**
 * Result wrapper for all filesystem operations
 */
export interface OperationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Information about a file or directory
 */
export interface FileInfo {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modifiedTime: Date;
}

/**
 * Options for edit operations
 */
export interface EditOptions {
  /** Replace all occurrences (default: false) */
  replaceAll?: boolean;
}

/**
 * FileSystem interface - all operations return OperationResult
 */
export interface FileSystem {
  /**
   * Read a file's contents
   * @param relativePath Path relative to workspace
   */
  read(relativePath: string): Promise<OperationResult<string>>;

  /**
   * Write content to a file (creates or overwrites)
   * @param relativePath Path relative to workspace
   * @param content Content to write
   */
  write(relativePath: string, content: string): Promise<OperationResult<void>>;

  /**
   * Edit a file by replacing a substring
   * @param relativePath Path relative to workspace
   * @param oldString String to find
   * @param newString String to replace with
   * @param options Edit options
   */
  edit(
    relativePath: string,
    oldString: string,
    newString: string,
    options?: EditOptions
  ): Promise<OperationResult<void>>;

  /**
   * List contents of a directory
   * @param relativePath Path relative to workspace (defaults to root)
   */
  list(relativePath?: string): Promise<OperationResult<FileInfo[]>>;

  /**
   * Find files matching a glob pattern
   * @param pattern Glob pattern to match files against
   * @param path Optional directory to search in (defaults to workspace root)
   */
  glob(pattern: string, path?: string): Promise<OperationResult<string[]>>;

  /**
   * Grep for patterns in files using ripgrep
   * @param options Grep options
   */
  grep(options: GrepOptions): Promise<OperationResult<GrepResult>>;
}

/**
 * Core operation function types
 */
export type ReadOperation = (
  workspace: string,
  relativePath: string
) => Promise<OperationResult<string>>;

export type WriteOperation = (
  workspace: string,
  relativePath: string,
  content: string
) => Promise<OperationResult<void>>;

export type EditOperation = (
  workspace: string,
  relativePath: string,
  oldString: string,
  newString: string,
  options?: EditOptions
) => Promise<OperationResult<void>>;

export type ListOperation = (
  workspace: string,
  relativePath?: string
) => Promise<OperationResult<FileInfo[]>>;

export type GlobOperation = (
  workspace: string,
  pattern: string,
  path?: string
) => Promise<OperationResult<string[]>>;

/**
 * Options for grep operations
 */
export interface GrepOptions {
  /** The regular expression pattern to search for */
  pattern: string;
  /** File or directory to search in (defaults to cwd) */
  path?: string;
  /** Glob pattern to filter files (e.g. "*.js") */
  glob?: string;
  /** File type to search (e.g. "js", "py", "rust") */
  type?: string;
  /** Output mode: "content", "files_with_matches", or "count" */
  output_mode?: 'content' | 'files_with_matches' | 'count';
  /** Case insensitive search */
  '-i'?: boolean;
  /** Show line numbers (for content mode) */
  '-n'?: boolean;
  /** Lines to show before each match */
  '-B'?: number;
  /** Lines to show after each match */
  '-A'?: number;
  /** Lines to show before and after each match */
  '-C'?: number;
  /** Limit output to first N lines/entries */
  head_limit?: number;
  /** Enable multiline mode */
  multiline?: boolean;
}

/**
 * Result from a grep operation (content mode)
 */
export interface GrepContentResult {
  path: string;
  matches: GrepMatch[];
}

/**
 * Result from a grep operation (count mode)
 */
export interface GrepCountResult {
  path: string;
  count: number;
}

/**
 * A specific match within a file for grep
 */
export interface GrepMatch {
  line: number;
  content: string;
  column?: number;
  beforeContext?: string[];
  afterContext?: string[];
}

/**
 * Union type for all grep result types
 */
export type GrepResult =
  | { mode: 'content'; data: GrepContentResult[] }
  | { mode: 'files_with_matches'; data: string[] }
  | { mode: 'count'; data: GrepCountResult[] };

export type GrepOperation = (
  workspace: string,
  options: GrepOptions
) => Promise<OperationResult<GrepResult>>;
