# Filesystem Toolkit Evaluations

This directory contains evaluation scenarios and agents to test the filesystem toolkit with real LLM agents.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
# Copy the example file
cp .env.example .env

# Edit .env and add your Anthropic API key
# ANTHROPIC_API_KEY=your-api-key-here
```

Alternatively, you can set environment variables directly:
```bash
export ANTHROPIC_API_KEY=your-api-key-here
```

## Running Evals

Run the default scenario (easy-search):
```bash
npm run eval
```

Run with verbose output to see agent execution in real-time:
```bash
npm run eval -- --verbose
```

Run a specific scenario:
```bash
npm run eval easy-search
npm run eval easy-search --verbose
```

## Environment Variables

- `ANTHROPIC_API_KEY` (required): Your Anthropic API key
- `EVAL_MODEL` (optional): Model to use (default: `claude-3-5-sonnet-20241022`)
- `EVAL_MAX_ITERATIONS` (optional): Maximum agent iterations (default: 15)

## Available Scenarios

### easy-search
**Difficulty:** Easy
**Description:** Find all TypeScript files that import the 'fs' module
**Skills tested:**
- Using glob to find files by pattern
- Using grep to search file contents
- Combining multiple tools effectively
- Providing accurate results

**Success criteria:**
- All 3 TypeScript files with fs imports are found
- No false positives (JS files or TS files without fs imports)
- Completed in ≤5 tool calls

## Adding New Scenarios

1. Create a new directory under `scenarios/`:
```bash
mkdir -p scenarios/my-scenario/workspace
```

2. Add test files to `scenarios/my-scenario/workspace/`

3. Create `scenarios/my-scenario/scenario.ts`:
```typescript
import type { EvalScenario } from '../../types';

export const myScenario: EvalScenario = {
  id: 'my-scenario',
  name: 'My Test Scenario',
  description: 'Description of what this tests',
  difficulty: 'medium',

  async setupWorkspace() {
    return path.join(__dirname, 'workspace');
  },

  getTask(workspace) {
    return 'Task description for the agent...';
  },

  async validate(workspace, agentResponse, toolCalls) {
    // Validation logic
    return {
      success: true,
      score: 1.0,
      toolCalls: toolCalls.length,
      toolCallDetails: toolCalls,
      errors: [],
      details: 'All checks passed',
      durationMs: 0,
    };
  },

  async cleanupWorkspace(workspace) {
    // Cleanup if needed (not needed for static workspaces)
  },
};
```

4. Register in `scenarios/index.ts`:
```typescript
import { myScenario } from './my-scenario/scenario';

export const scenarios: Record<string, EvalScenario> = {
  // ...existing scenarios
  [myScenario.id]: myScenario,
};
```

## Cost Considerations

⚠️ **Important**: Running evaluations consumes LLM tokens and incurs costs.

Approximate costs per run (using Claude 3.5 Sonnet):
- Easy scenario: ~$0.01-0.05 per run
- Medium scenario: ~$0.05-0.15 per run
- Hard scenario: ~$0.10-0.30 per run

To minimize costs:
- Test locally before CI
- Use `EVAL_MAX_ITERATIONS` to limit agent steps
- Run specific scenarios instead of all
- Consider using cheaper models for development

## CI Integration

To run evals in CI, set the API key as a secret and add to your workflow:

```yaml
- name: Run evaluations
  env:
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
  run: npm run eval
```

Consider running evals:
- Only on main/release branches
- Only when eval files change
- On a schedule (e.g., nightly)
- As manual workflow dispatch

## Troubleshooting

**Agent times out:**
- Increase `EVAL_MAX_ITERATIONS`
- Check if task description is clear enough
- Review workspace contents for issues

**Agent fails to find answer:**
- Run with `--verbose` to see tool calls
- Check if required tools are available
- Verify workspace setup is correct

**Validation fails:**
- Check agent's response format
- Review validation regex patterns
- Ensure expected files are correct

## Structure

```
evals/
├── agent/              # LangGraph ReAct agent
│   └── index.ts
├── scenarios/          # Evaluation scenarios
│   ├── easy-search/
│   │   ├── workspace/  # Static test workspace
│   │   └── scenario.ts
│   └── index.ts
├── types.ts            # Type definitions
├── runner.ts           # Main eval runner
└── README.md           # This file
```
