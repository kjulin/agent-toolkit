# @agent-toolkit/messages

Message formatting utilities for various agent frameworks. Provides consistent formatting and display of agent messages, tool calls, and tool responses.

## Features

- **LangChain Support**: Format LangChain messages for terminal display
- **Type-Safe**: Full TypeScript support with detailed interfaces
- **Framework Agnostic Core**: Easy to extend for other frameworks
- **Terminal Optimized**: Clean, readable output for CLI applications

## Installation

```bash
npm install @agent-toolkit/messages
```

## Quick Start

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
  terminal(): string;
}
```

### Types

```typescript
interface ToolCall {
  name: string;
  args: Record<string, unknown>;
  id?: string;
}

interface ToolResponse {
  output: string;
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
