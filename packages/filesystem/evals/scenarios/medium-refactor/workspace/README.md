# Medium Refactor Scenario

This workspace contains files that need refactoring to use a proper logger instead of console.log.

## Files to modify

The following files in `src/` should have their `console.log` statements replaced with `logger.info`:

1. **src/auth.ts** - 3 console.log statements
2. **src/database.ts** - 3 console.log statements
3. **src/api.ts** - 2 console.log statements

**Total**: 8 console.log statements to replace

## Files to EXCLUDE

- **src/logger.ts** - Already uses console.log internally (part of logger implementation)
- **src/types.ts** - No console.log statements
- **tests/utils.test.ts** - Test files should keep console.log for debugging

## Expected changes

Each file with console.log should:
1. Add import: `import { logger } from './logger';`
2. Replace `console.log(...)` with `logger.info(...)`
3. Preserve the exact message and arguments

## Example

Before:
```typescript
console.log('Authenticating user:', username);
```

After:
```typescript
import { logger } from './logger';

logger.info('Authenticating user:', username);
```
