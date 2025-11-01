# Agent Toolkit

A collection of TypeScript toolkits designed for AI agents and automation workflows. Built as a monorepo with independent packages that can be developed and versioned separately.

## Packages

### [@agent-toolkit/filesystem](./packages/filesystem)

Filesystem operations toolkit with secure sandboxing and first-class LangChain integration.

```bash
npm install @agent-toolkit/filesystem
```

Features:
- Core filesystem operations (read, write, edit, list, glob, grep)
- Functional API with workspace sandboxing
- LangChain/LangGraph integration
- Type-safe with full TypeScript support

[See full documentation →](./packages/filesystem/README.md)

### [@agent-toolkit/messages](./packages/messages)

Message formatting utilities for various agent frameworks.

```bash
npm install @agent-toolkit/messages
```

Features:
- LangChain message formatting for terminal display
- Type-safe message handling
- Tool call and response formatting
- Framework agnostic core

[See full documentation →](./packages/messages/README.md)

## Development

This is a monorepo managed with npm workspaces. Each package can be developed independently.

### Setup

```bash
# Install all dependencies
npm install

# Build all packages
npm run build

# Run tests across all packages
npm test
```

### Working with individual packages

```bash
# Work in a specific package
cd packages/filesystem

# Install dependencies for that package
npm install

# Build just that package
npm run build

# Run tests for that package
npm test
```

### Adding a new toolkit

1. Create a new directory under `packages/`:
   ```bash
   mkdir packages/my-toolkit
   cd packages/my-toolkit
   npm init -y
   ```

2. Update the package name to use the `@agent-toolkit/` scope:
   ```json
   {
     "name": "@agent-toolkit/my-toolkit",
     "version": "0.1.0",
     ...
   }
   ```

3. Run `npm install` at the root to register the new workspace

## Structure

```
agent-toolkit/
├── package.json          # Root workspace config
├── packages/
│   ├── filesystem/       # @agent-toolkit/filesystem
│   │   ├── src/
│   │   ├── tests/
│   │   ├── evals/
│   │   └── package.json
│   └── ...              # Future toolkits (web, http, etc.)
└── README.md
```

## Publishing

Each package is published independently to npm under the `@agent-toolkit/` scope.

```bash
cd packages/filesystem
npm publish --access public
```

## License

MIT
