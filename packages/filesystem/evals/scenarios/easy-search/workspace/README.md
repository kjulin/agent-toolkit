# Test Project

This is a test project with various TypeScript and JavaScript files.
Some files import the fs module, while others don't.

## Expected Results

TypeScript files that import 'fs':
- src/file-reader.ts
- src/file-writer.ts
- lib/utils.ts

TypeScript files that do NOT import 'fs':
- src/calculator.ts
- src/string-utils.ts
- lib/http-client.ts
- tests/utils.test.ts

JavaScript files (should be excluded from results):
- lib/legacy.js (has fs import)
- build.js (has fs import)
