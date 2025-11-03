# @agent-toolkit/database

PostgreSQL database tools for AI agents with schema exploration capabilities.

## Features

- **SELECT queries**: Execute read-only SELECT queries with parameter binding
- **Schema exploration**: Query information_schema to explore database structure
- **Security**: SQL injection prevention and query validation (SELECT-only)
- **Framework-agnostic core**: Use with any AI agent framework
- **Claude Agent SDK integration**: Pre-built MCP server for Claude agents
- **PII masking**: (Future) Automatic detection and masking of personally identifiable information

## Installation

```bash
npm install @agent-toolkit/database
```

### Prerequisites

- PostgreSQL database (local or remote)
- Node.js 18+

## Quick Start

### Core API (Framework-Agnostic)

```typescript
import { createDatabase } from '@agent-toolkit/database';

// Create database instance
const db = createDatabase('postgresql://user:pass@localhost:5432/mydb');

// Execute SELECT query
const result = await db.select('SELECT * FROM users WHERE age > $1', [30]);
if (result.success) {
  console.log(result.data.rows);
  console.log(`Found ${result.data.rowCount} rows`);
}

// Explore schema using information_schema
const tables = await db.select(`
  SELECT table_name, table_schema
  FROM information_schema.tables
  WHERE table_schema = 'public'
`);
```

### Claude Agent SDK Integration

```typescript
import { query } from '@anthropic-ai/claude-agent-sdk';
import { createClaudeAgentDatabaseTools } from '@agent-toolkit/database/claude-agent-sdk';

// Create database MCP server
const dbServer = createClaudeAgentDatabaseTools({
  connectionString: 'postgresql://user:pass@localhost:5432/mydb',
  maskPII: false // Enable PII masking (future feature)
});

// Run agent with database tools
const result = await query({
  prompt: 'Find all active users in the database and show me their emails',
  options: {
    mcpServers: {
      database: dbServer
    }
  }
});

// Process results
for await (const message of result) {
  if (message.type === 'result' && message.subtype === 'success') {
    console.log(message.result);
  }
}
```

## API Reference

### Core API

#### `createDatabase(connectionString, options?)`

Creates a database instance with operations bound to a connection.

**Parameters:**
- `connectionString` (string): PostgreSQL connection string
- `options` (object, optional):
  - `maskPII` (boolean): Enable PII masking (future feature)

**Returns:** `Database` instance

**Example:**
```typescript
const db = createDatabase('postgresql://localhost:5432/mydb', {
  maskPII: true
});
```

#### `db.select(query, params?)`

Execute a SELECT query on the database.

**Parameters:**
- `query` (string): SQL SELECT query (must start with SELECT or WITH)
- `params` (any[], optional): Query parameters for parameterized queries

**Returns:** `Promise<OperationResult<QueryResult>>`

**Example:**
```typescript
// Basic query
const result = await db.select('SELECT * FROM users');

// With WHERE clause
const result = await db.select('SELECT * FROM users WHERE age > 25');

// Parameterized query
const result = await db.select(
  'SELECT * FROM users WHERE department = $1 AND active = $2',
  ['Engineering', true]
);

// With JOIN
const result = await db.select(`
  SELECT u.name, o.total
  FROM users u
  JOIN orders o ON u.id = o.user_id
  WHERE o.status = 'completed'
`);

// With CTE
const result = await db.select(`
  WITH high_value_orders AS (
    SELECT * FROM orders WHERE total > 1000
  )
  SELECT customer_name, COUNT(*) as order_count
  FROM high_value_orders
  GROUP BY customer_name
`);
```


### Types

#### `OperationResult<T>`

Standard result wrapper for all operations.

```typescript
interface OperationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}
```

#### `QueryResult`

Result from a SELECT query.

```typescript
interface QueryResult {
  rows: Record<string, any>[];
  rowCount: number;
  fields: FieldInfo[];
  piiFields?: PIIField[]; // Only present when PII masking is enabled
}
```

## Claude Agent SDK Tools

When using the Claude Agent SDK integration, the following tool is available to the agent:

### `execute_select`

Execute a SELECT query on the database. Can also be used to explore the database schema by querying information_schema tables.

**Input:**
- `query` (string): SQL SELECT query (can query information_schema.tables and information_schema.columns to explore schema)
- `params` (array, optional): Query parameters

**Output:** JSON with rows, rowCount, and field information

## Development

### Running Tests

Tests require a local PostgreSQL database:

```bash
# Using Docker (recommended)
docker run --name postgres-test \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=tests \
  -p 5432:5432 \
  -d postgres:16

# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

See [tests/README.md](./tests/README.md) for detailed setup instructions.

### Running Evaluations

Evaluations test the database tools with a real AI agent using the Claude Agent SDK.

**Setup:**

1. Copy `.env.example` to `.env` and add your API key:
   ```bash
   cp .env.example .env
   # Edit .env and add your ANTHROPIC_API_KEY
   ```

2. Run evaluations:
   ```bash
   # Run all evaluation scenarios
   npm run eval

   # Run a specific scenario
   npm run eval easy-column-fetch
   npm run eval medium-jsonb-navigation

   # Use a different model (override in .env or command line)
   MODEL=claude-3-opus-20240229 npm run eval
   ```

**Available Scenarios:**
- `easy-column-fetch`: Simple WHERE clause filtering on table columns
- `medium-jsonb-navigation`: JSONB column navigation with joins across tables

### Project Structure

```
packages/database/
├── src/
│   ├── core/              # Framework-agnostic database operations
│   │   ├── index.ts       # createDatabase factory
│   │   ├── select.ts      # SELECT query execution
│   │   └── list-tables.ts # Schema exploration
│   ├── sdks/
│   │   └── claude-agent-sdk/  # Claude Agent SDK integration
│   │       ├── index.ts
│   │       └── database.ts    # MCP server and tools
│   ├── types.ts           # TypeScript types
│   └── index.ts           # Main exports
├── tests/                 # Unit tests
│   ├── select.test.ts
│   ├── list-tables.test.ts
│   └── README.md
├── evals/                 # Agent evaluations
│   ├── agent/             # Agent runner
│   ├── scenarios/         # Evaluation scenarios
│   │   ├── easy-column-fetch/
│   │   │   ├── seed.sql   # Database setup
│   │   │   └── scenario.ts
│   │   └── medium-jsonb-navigation/
│   │       ├── seed.sql
│   │       └── scenario.ts
│   ├── types.ts
│   └── runner.ts          # Eval runner script
└── README.md
```

## Security

### SQL Injection Prevention

All queries are validated to ensure they are SELECT-only statements. The package uses PostgreSQL parameterized queries to prevent SQL injection:

```typescript
// ✓ Safe - uses parameterized query
await db.select('SELECT * FROM users WHERE id = $1', [userId]);

// ✗ Rejected - not a SELECT query
await db.select('DELETE FROM users WHERE id = 1');
// Returns: { success: false, error: 'Only SELECT queries are allowed' }
```

### Read-Only Access

Only SELECT and WITH (CTE) queries are allowed. All mutation operations (INSERT, UPDATE, DELETE, DROP, etc.) are blocked.

## Roadmap

- [ ] PII detection and masking
- [ ] Additional database operations (INSERT, UPDATE, DELETE) with explicit opt-in
- [ ] Query result caching
- [ ] Query timeout configuration
- [ ] Connection pooling configuration
- [ ] Support for other databases (MySQL, SQLite)

## License

MIT
