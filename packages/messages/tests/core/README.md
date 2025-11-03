# Core Formatter Tests

This directory contains fixture-based tests for the core message formatter.

## Files

- **`input.json`**: Array of generic `Message` objects to be formatted
- **`output.txt`**: Expected terminal output for all messages (concatenated with `\n\n` separator)
- **`formatter.test.ts`**: Test that validates formatter output matches expected output

## Development Workflow

When improving the formatter:

1. **Modify formatter logic** in `src/core/formatter.ts`
2. **Update fixtures** if needed:
   - Edit `input.json` to add/modify test messages
   - Run the formatter manually to generate actual output
   - Update `output.txt` with the expected output
3. **Run tests** to verify: `npm test`

## Regenerating output.txt

If you make intentional changes to the formatter and need to update the expected output:

```bash
node -e "
import { readFileSync } from 'fs';
import { formatMessage } from './dist/core/formatter.js';

const messages = JSON.parse(readFileSync('./tests/core/input.json', 'utf-8'));
const outputs = messages.map(msg => formatMessage(msg).terminal());
console.log(outputs.join('\n\n'));
" > tests/core/output.txt
```

## Message Types Covered

The fixtures currently test:
- AI messages with single tool call
- AI messages with multiple tool calls
- Tool success responses
- Tool error responses (with "Error:" prefix)
- Final AI responses without tool calls
