# @agent-toolkit/filesystem

A TypeScript toolkit for filesystem operations designed for AI agents and automation workflows. Provides secure, sandboxed file operations with first-class LangChain/LangGraph integration.

## Features

- **Core Operations**: Read, write, edit, list, glob, and grep operations
- **Functional API**: Curried functions with workspace sandboxing
- **LangChain Integration**: Pre-built tools for ReAct agents
- **Type-Safe**: Full TypeScript support with detailed interfaces
- **Secure**: All operations are scoped to a workspace directory
- **Well-Tested**: Comprehensive test suite with 139+ tests

## Installation

```bash
npm install @agent-toolkit/filesystem
```

## Quick Start

### Basic Usage

```typescript
import { createFileSystem } from '@agent-toolkit/filesystem';

// Create a sandboxed filesystem instance
const fs = createFileSystem('/path/to/workspace');

// Read a file
const content = await fs.read('config.json');
if (content.success) {
  console.log(content.data);
}

// Write a file
await fs.write('output.txt', 'Hello, world!');

// Edit a file (replace text)
await fs.edit('config.json', '"port": 3000', '"port": 8080');

// List directory
const files = await fs.list('src');
if (files.success) {
  files.data.forEach(item => {
    console.log(`${item.isDirectory ? 'DIR' : 'FILE'}: ${item.name}`);
  });
}

// Find files by pattern
const tsFiles = await fs.glob('**/*.ts');

// Search file contents
const matches = await fs.grep({
  pattern: 'import.*react',
  type: 'tsx',
  output_mode: 'files_with_matches'
});
```

### LangChain/LangGraph Integration

```typescript
import { ChatAnthropic } from '@langchain/anthropic';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { createLangchainFileSystemTools } from '@agent-toolkit/filesystem/langchain';

// Create filesystem tools for your workspace
const tools = createLangchainFileSystemTools({
  workspace: '/path/to/project'
});

// Create an agent
const llm = new ChatAnthropic({
  model: 'claude-3-5-sonnet-20241022',
  temperature: 0,
});

const agent = createReactAgent({ llm, tools });

// Run the agent
const result = await agent.invoke({
  messages: [{
    role: 'user',
    content: 'Find all TypeScript files that import React'
  }]
});
```

## API Reference

### Core Operations

#### `createFileSystem(workspace: string): FileSystem`

Creates a sandboxed filesystem instance. All operations are relative to the workspace directory.

```typescript
const fs = createFileSystem('/Users/me/project');
```

#### `read(path: string): Promise<OperationResult<string>>`

Reads the contents of a file.

```typescript
const result = await fs.read('package.json');
if (result.success) {
  console.log(result.data); // File contents as string
}
```

#### `write(path: string, content: string): Promise<OperationResult<void>>`

Writes content to a file. Creates parent directories if needed.

```typescript
await fs.write('src/new-file.ts', 'export const foo = "bar";');
```

#### `edit(path: string, oldString: string, newString: string, options?: { replaceAll?: boolean }): Promise<OperationResult<void>>`

Edits a file by replacing text. More token-efficient than rewriting entire files.

```typescript
// Replace first occurrence (default)
await fs.edit('config.ts', 'port = 3000', 'port = 8080');

// Replace all occurrences
await fs.edit('app.ts', 'console.log', 'logger.info', { replaceAll: true });
```

#### `list(path?: string): Promise<OperationResult<FileInfo[]>>`

Lists contents of a directory.

```typescript
const result = await fs.list('src');
if (result.success) {
  result.data.forEach(item => {
    console.log(item.name, item.size, item.isDirectory);
  });
}
```

#### `glob(pattern: string, path?: string): Promise<OperationResult<string[]>>`

Finds files matching a glob pattern.

```typescript
// Find all TypeScript files
const files = await fs.glob('**/*.ts');

// Find test files in a specific directory
const tests = await fs.glob('**/*.test.ts', 'src');
```

Glob patterns support:
- `*` - matches any characters except `/`
- `**` - matches any characters including `/`
- `?` - matches single character
- `[abc]` - matches character class

#### `grep(options: GrepOptions): Promise<OperationResult<GrepResult>>`

Searches file contents using ripgrep. Very powerful for code analysis.

```typescript
// Find files containing pattern
const result = await fs.grep({
  pattern: 'import.*react',
  type: 'tsx',
  output_mode: 'files_with_matches'
});

// Search with context lines
const matches = await fs.grep({
  pattern: 'function handleClick',
  glob: '*.ts',
  output_mode: 'content',
  '-B': 2, // 2 lines before
  '-A': 2, // 2 lines after
  '-n': true, // show line numbers
});

// Case-insensitive count
const counts = await fs.grep({
  pattern: 'TODO',
  '-i': true,
  output_mode: 'count'
});
```

**GrepOptions:**
- `pattern` (required): Regular expression pattern
- `path`: File or directory to search (defaults to workspace root)
- `glob`: Filter files by glob pattern (e.g., `"*.js"`)
- `type`: Filter by file type (e.g., `"js"`, `"py"`, `"rust"`)
- `output_mode`: `"content"` | `"files_with_matches"` | `"count"`
- `"-i"`: Case-insensitive search
- `"-n"`: Show line numbers (content mode only)
- `"-B"`, `"-A"`, `"-C"`: Context lines before/after/around matches
- `head_limit`: Limit results to first N matches
- `multiline`: Enable multiline pattern matching

## LangChain Tools

### `createLangchainFileSystemTools(options)`

Creates LangChain tools for use with agents.

```typescript
import { createLangchainFileSystemTools } from '@agent-toolkit/filesystem/langchain';

const tools = createLangchainFileSystemTools({
  workspace: '/path/to/workspace',
  // Optionally specify which tools to include
  tools: ['read', 'write', 'grep'] // Default: all tools
});
```

**Available Tools:**
- `read_file` - Read file contents
- `write_file` - Write to a file
- `edit_file` - Edit file by replacing text
- `list_directory` - List directory contents
- `find_files` - Find files by glob pattern
- `search_content` - Search file contents with ripgrep

### Message Formatting

Format LangChain messages for terminal output:

```typescript
import { LangchainMessage } from '@agent-toolkit/filesystem/langchain';
import { AIMessage } from '@langchain/core/messages';

const message = new AIMessage({ content: '...', tool_calls: [...] });
const formatter = LangchainMessage(message);

// Type checks
formatter.isAI(); // true
formatter.isToolCall(); // true if has tool calls

// Get data
formatter.getToolCalls(); // Array of tool calls
formatter.getContent(); // Message content

// Terminal-friendly output
console.log(formatter.terminal());
// 🔧 search_content
//    • pattern: import.*fs
//    • type: ts
```

## Running Evals

The package includes an evaluation framework for testing agent performance.

```bash
# Set up environment
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY

# Run an evaluation scenario
npm run eval -- easy-search

# Run with verbose output
npm run eval -- easy-search --verbose
```

**Available Scenarios:**
- `easy-search` - Find TypeScript files importing a module

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Build the package
npm run build

# Run evals
npm run eval -- <scenario-id>
```

## Architecture

### Functional Design

All operations use a curried pattern for clean composition:

```typescript
// Operation signature
type Operation = (workspace: string) => (args: Args) => Promise<Result>

// Example
const read = (workspace: string) => async (path: string) => {
  // Implementation
};

// Usage
const fs = {
  read: read(workspace),
  write: write(workspace),
  // ...
};

await fs.read('file.txt'); // Workspace is captured in closure
```

### Security

All operations are sandboxed to the workspace directory:
- Paths are resolved and checked against the workspace
- Attempts to access files outside workspace will fail
- No symbolic link traversal outside workspace

### Error Handling

All operations return a result object:

```typescript
interface OperationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}
```

This allows for predictable error handling without exceptions.

## License

MIT

## Contributing

Contributions welcome! Please ensure all tests pass before submitting PRs.

```bash
npm test
```
