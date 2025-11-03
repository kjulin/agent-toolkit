# @agent-toolkit/messages

Message formatting utilities for various agent frameworks. Provides consistent formatting and display of agent messages, tool calls, and tool responses.

## Features

- **Framework Agnostic Core**: Generic message types and formatters
- **SDK Adapters**: Easy integration with LangChain and other frameworks
- **Type-Safe**: Full TypeScript support with detailed interfaces
- **Terminal Optimized**: Clean, readable output for CLI applications
- **Extensible**: Simple adapter pattern for adding new frameworks

## Installation

```bash
npm install @agent-toolkit/messages
```

## Architecture

This package uses a **core + adapters** pattern:

- **Core** (`src/core/`): Framework-agnostic message types and formatters
- **Adapters** (`src/langchain/`, etc.): Convert framework-specific messages to core types

This design allows:
1. Single source of truth for formatting logic
2. Easy addition of new framework adapters
3. Direct use of core types for custom implementations

## Quick Start

### Using Framework-Agnostic Core

```typescript
import { formatMessage, type Message } from '@agent-toolkit/messages';

const message: Message = {
  type: 'ai',
  content: 'Let me search for that file.',
  toolCalls: [{
    name: 'search_content',
    args: { pattern: 'import.*fs', type: 'ts' },
    id: 'call_123'
  }]
};

const formatter = formatMessage(message);

// Terminal-friendly output
console.log(formatter.terminal());
// 🔧 search_content
//    • pattern: import.*fs
//    • type: ts

// Raw JSON output (for debugging)
console.log(formatter.raw());
// {
//   "type": "ai",
//   "content": "Let me search for that file.",
//   "toolCalls": [
//     {
//       "name": "search_content",
//       "args": { "pattern": "import.*fs", "type": "ts" },
//       "id": "call_123"
//     }
//   ]
// }
```

### LangChain Message Formatting

```typescript
import { LangchainMessage } from '@agent-toolkit/messages';
import { AIMessage } from '@langchain/core/messages';

const message = new AIMessage({
  content: 'Let me search for that file.',
  tool_calls: [{
    name: 'search_content',
    args: { pattern: 'import.*fs', type: 'ts' },
    id: 'call_123'
  }]
});

const formatter = LangchainMessage(message);

// Type checks
formatter.isAI();         // true
formatter.isToolCall();   // true

// Get data
formatter.getToolCalls(); // Array of tool calls
formatter.getContent();   // Message content

// Terminal-friendly output
console.log(formatter.terminal());
// 🔧 search_content
//    • pattern: import.*fs
//    • type: ts
```

## API Reference

### `LangchainMessage(message: BaseMessage): MessageFormatter`

Creates a message formatter for LangChain messages.

```typescript
const formatter = LangchainMessage(message);
```

### MessageFormatter Interface

```typescript
interface MessageFormatter {
  // Type checks
  isAI(): boolean;
  isTool(): boolean;
  isToolCall(): boolean;
  isToolResponse(): boolean;

  // Data extraction
  getToolCalls(): ToolCall[];
  getToolResponse(): ToolResponse | null;
  getContent(): string;

  // Formatting
  terminal(): string;  // Terminal-friendly formatted output
  raw(): string;       // Raw message as formatted JSON
}
```

**Formatting Methods:**
- `terminal()`: Returns human-readable formatted output optimized for CLI display
- `raw()`: Returns the underlying generic `Message` object as formatted JSON (useful for debugging)

### Core Types

```typescript
type MessageType = 'ai' | 'human' | 'system' | 'tool';

interface Message {
  type: MessageType;
  content: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
  toolName?: string;
}

interface ToolCall {
  name: string;
  args: Record<string, unknown>;
  id?: string;
}

interface ToolResponse {
  output: string;
  toolCallId?: string;
  toolName?: string;
}
```

## Creating Adapters for Other Frameworks

To add support for a new framework, create an adapter that converts framework-specific messages to the core `Message` type:

```typescript
import { formatMessage, type Message, type MessageFormatter } from '@agent-toolkit/messages';

export function YourFrameworkMessage(message: YourFrameworkMessageType): MessageFormatter {
  // Convert to generic Message format
  const genericMessage: Message = {
    type: convertType(message.type),
    content: message.content,
    toolCalls: message.tools?.map(t => ({
      name: t.name,
      args: t.arguments,
      id: t.id
    })),
    // ... other fields
  };

  // Use core formatter
  return formatMessage(genericMessage);
}
```

## Usage with Agent Loops

```typescript
import { LangchainMessage } from '@agent-toolkit/messages';
import { createReactAgent } from '@langchain/langgraph/prebuilt';

const agent = createReactAgent({ llm, tools });

const stream = await agent.stream({
  messages: [{ role: 'user', content: 'Find TypeScript files' }]
});

for await (const chunk of stream) {
  if (chunk.agent?.messages) {
    for (const message of chunk.agent.messages) {
      const formatter = LangchainMessage(message);
      console.log(formatter.terminal());
    }
  }
}
```

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
```

## License

MIT

## Contributing

Part of the [agent-toolkit](https://github.com/kjulin/agent-toolkit) monorepo.
