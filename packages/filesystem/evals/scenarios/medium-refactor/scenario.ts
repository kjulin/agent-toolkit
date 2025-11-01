import * as path from 'path';
import * as fs from 'fs/promises';
import * as crypto from 'crypto';
import { z } from 'zod';
import type { EvalScenario, EvalResult, ToolCall } from '../../types';
import { createFileSystem } from '../../../src/core/index';

/**
 * Medium Refactor Scenario: Replace console.log with logger.info
 *
 * Tests the agent's ability to:
 * - Find files containing console.log
 * - Read and understand file structure
 * - Add imports to files
 * - Replace code patterns with edit tool
 * - Avoid modifying excluded files (logger.ts, tests)
 */
export const mediumRefactorScenario: EvalScenario = {
  id: 'medium-refactor',
  name: 'Refactor console.log to logger',
  description: 'Replace console.log calls with logger.info in source files',
  difficulty: 'medium',

  async setupWorkspace(): Promise<string> {
    // Create a temporary copy of the static workspace
    const staticWorkspace = path.join(__dirname, 'workspace');
    const tempId = crypto.randomBytes(8).toString('hex');
    const tempWorkspace = path.join(__dirname, `workspace-${tempId}`);

    // Copy the entire directory
    await fs.cp(staticWorkspace, tempWorkspace, { recursive: true });

    return tempWorkspace;
  },

  getTask(workspace: string): string {
    return `Refactor the codebase to use proper logging instead of console.log.

**Task**: Replace all console.log statements with logger.info calls in TypeScript files under src/ (excluding src/logger.ts).

**CRITICAL**: The code will break if you don't add the import statement! Each file must have BOTH:
1. The import statement at the top: \`import { logger } from './logger';\`
2. All console.log calls replaced with logger.info

**Step-by-step process for each file**:
1. Find all files using console.log
2. Read the file to see its current imports and console.log statements
3. Add the logger import using edit_file:
   - Find the last import statement in the file
   - Use edit_file to replace it with itself PLUS the logger import
   - Example: Replace \`import { User } from './types';\` with \`import { User } from './types';\\nimport { logger } from './logger';\`
4. Replace all console.log with logger.info using edit_file with replaceAll: true
5. Verify the file has both the import AND the replacements

**IMPORTANT**: Use edit_file for BOTH steps - NEVER use write_file as it will erase the entire file!

**FILES TO EXCLUDE**: DO NOT consider src/logger.ts and DO NOT consider test files

**Complete example transformation**:

Before (src/auth.ts):
\`\`\`typescript
import { User } from './types';

export function authenticateUser(username: string) {
  console.log('Authenticating user:', username);
  // ... more code with console.log
}
\`\`\`

After (src/auth.ts):
\`\`\`typescript
import { User } from './types';
import { logger } from './logger';

export function authenticateUser(username: string) {
  logger.info('Authenticating user:', username);
  // ... more code with logger.info
}
\`\`\`

**Verification checklist for each file**:
- [ ] Has the logger import at the top
- [ ] All console.log replaced with logger.info
- [ ] Same arguments preserved

Submit the list of files you modified and the number of replacements made in each file.`;
  },

  getResultSchema() {
    return z.object({
      filesModified: z.array(z.object({
        path: z.string().describe('Relative path to the modified file'),
        replacements: z.number().describe('Number of console.log statements replaced in this file'),
      })).describe('List of files modified with replacement counts'),
    });
  },

  async validate(workspace: string, agentResponse: string, toolCalls: ToolCall[], structuredResult?: Record<string, unknown>): Promise<EvalResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const fs = createFileSystem(workspace);

    // Expected modifications
    const expectedFiles = new Map([
      ['src/auth.ts', 3],
      ['src/database.ts', 3],
      ['src/api.ts', 2],
    ]);

    const excludedFiles = ['src/logger.ts', 'src/types.ts', 'tests/utils.test.ts'];

    // Extract structured result
    let filesModified: Array<{ path: string; replacements: number }> = [];

    if (structuredResult && Array.isArray(structuredResult.filesModified)) {
      filesModified = structuredResult.filesModified as Array<{ path: string; replacements: number }>;
    } else {
      errors.push('No structured result provided or invalid format');
      return {
        success: false,
        score: 0,
        toolCalls: toolCalls.length,
        toolCallDetails: toolCalls,
        errors,
        details: 'Missing structured result',
        durationMs: Date.now() - startTime,
      };
    }

    // Verify each expected file
    const modifiedMap = new Map(filesModified.map(f => [f.path, f.replacements]));
    let correctModifications = 0;
    let correctReplacements = 0;
    let totalExpectedReplacements = 0;

    for (const [expectedPath, expectedCount] of expectedFiles) {
      totalExpectedReplacements += expectedCount;

      // Check file was modified
      if (!modifiedMap.has(expectedPath)) {
        errors.push(`Missing modification: ${expectedPath}`);
        continue;
      }

      const reportedCount = modifiedMap.get(expectedPath)!;

      // Verify the file content
      const fileResult = await fs.read(expectedPath);
      if (!fileResult.success) {
        errors.push(`Failed to read ${expectedPath}: ${fileResult.error}`);
        continue;
      }

      const content = fileResult.data!;

      // Check import was added
      if (!content.includes("import { logger } from './logger';")) {
        errors.push(`${expectedPath}: Missing logger import`);
      }

      // Check no console.log remains
      const remainingConsoleLogs = (content.match(/console\.log/g) || []).length;
      if (remainingConsoleLogs > 0) {
        errors.push(`${expectedPath}: Still has ${remainingConsoleLogs} console.log statements`);
      }

      // Check logger.info was added
      const loggerInfoCalls = (content.match(/logger\.info/g) || []).length;
      if (loggerInfoCalls !== expectedCount) {
        errors.push(`${expectedPath}: Expected ${expectedCount} logger.info calls, found ${loggerInfoCalls}`);
      } else if (reportedCount === expectedCount) {
        correctModifications++;
        correctReplacements += expectedCount;
      }

      if (reportedCount !== expectedCount) {
        errors.push(`${expectedPath}: Reported ${reportedCount} replacements, expected ${expectedCount}`);
      }
    }

    // Check excluded files were NOT modified
    for (const excludedPath of excludedFiles) {
      if (modifiedMap.has(excludedPath)) {
        errors.push(`Incorrectly modified excluded file: ${excludedPath}`);
      }

      // Verify excluded files still have their original content
      const fileResult = await fs.read(excludedPath);
      if (fileResult.success) {
        const content = fileResult.data!;

        // logger.ts should still have console.log in its implementation
        if (excludedPath === 'src/logger.ts') {
          const consoleCalls = (content.match(/console\.(log|error|debug)/g) || []).length;
          if (consoleCalls === 0) {
            errors.push(`${excludedPath}: Logger implementation was incorrectly modified`);
          }
        }

        // tests should still have console.log
        if (excludedPath.includes('test')) {
          if (!content.includes('console.log')) {
            errors.push(`${excludedPath}: Test file was incorrectly modified`);
          }
        }
      }
    }

    // Check for extra modifications
    const extraFiles = filesModified.filter(f => !expectedFiles.has(f.path) && !excludedFiles.includes(f.path));
    if (extraFiles.length > 0) {
      errors.push(`Unexpected modifications: ${extraFiles.map(f => f.path).join(', ')}`);
    }

    // Calculate score
    const precision = filesModified.length > 0 ? correctModifications / filesModified.length : 0;
    const recall = correctModifications / expectedFiles.size;
    const f1Score = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

    const success = correctModifications === expectedFiles.size && errors.length === 0;

    // Check tool efficiency
    const editCalls = toolCalls.filter(tc => tc.name === 'edit_file').length;
    const efficient = editCalls >= totalExpectedReplacements && editCalls <= totalExpectedReplacements * 2;

    let details = `Modified ${correctModifications}/${expectedFiles.size} files correctly.\n`;
    details += `Replaced ${correctReplacements}/${totalExpectedReplacements} console.log statements.\n`;

    if (success) {
      details += '✓ All files refactored correctly!\n';
      details += '✓ No excluded files were modified\n';
    } else {
      if (correctModifications < expectedFiles.size) {
        const missed = [...expectedFiles.keys()].filter(f => !modifiedMap.has(f));
        if (missed.length > 0) {
          details += `✗ Missed files: ${missed.join(', ')}\n`;
        }
      }
      if (extraFiles.length > 0) {
        details += `✗ Extra modifications: ${extraFiles.map(f => f.path).join(', ')}\n`;
      }
    }

    details += `Tool calls: ${toolCalls.length} (edit calls: ${editCalls}, ${efficient ? '✓ efficient' : '✗ could be more efficient'})\n`;
    details += `Precision: ${(precision * 100).toFixed(1)}%, Recall: ${(recall * 100).toFixed(1)}%, F1: ${(f1Score * 100).toFixed(1)}%`;

    return {
      success,
      score: f1Score,
      toolCalls: toolCalls.length,
      toolCallDetails: toolCalls,
      errors,
      details,
      durationMs: Date.now() - startTime,
    };
  },

  async cleanupWorkspace(workspace: string): Promise<void> {
    // Remove the temporary workspace copy
    await fs.rm(workspace, { recursive: true, force: true });
  },
};
