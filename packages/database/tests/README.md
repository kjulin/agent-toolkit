# Database Package Tests

## Prerequisites

Tests require a local PostgreSQL database running.

### Setup PostgreSQL

#### Option 1: Using Docker (Recommended)

```bash
docker run --name postgres-test \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=tests \
  -p 5432:5432 \
  -d postgres:16
```

#### Option 2: Using Homebrew (macOS)

```bash
brew install postgresql@16
brew services start postgresql@16
createdb tests
```

#### Option 3: Using apt (Ubuntu/Debian)

```bash
sudo apt-get install postgresql
sudo -u postgres createdb tests
```

### Connection String

The tests use the following default connection string:

```
postgresql://postgres:postgres@localhost:5432/tests
```

You can override this by setting the `TEST_DATABASE_URL` environment variable:

```bash
export TEST_DATABASE_URL="postgresql://your_user:your_pass@localhost:5432/your_db"
npm test
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test select.test.ts
```

## Test Structure

- `select.test.ts` - Tests for SELECT query execution
- `list-tables.test.ts` - Tests for schema exploration
- `detect-pii.test.ts` - Tests for PII detection
- `workspace/` - Test workspace for temporary test databases

## Cleanup

To stop and remove the Docker container:

```bash
docker stop postgres-test
docker rm postgres-test
```
