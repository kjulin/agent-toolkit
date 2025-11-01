import * as path from 'path';
import { z } from 'zod';
import type { EvalScenario, EvalResult, ToolCall } from '../../types';

/**
 * Easy Search Scenario: Find TypeScript files that import 'fs'
 *
 * Tests the agent's ability to:
 * - Use glob to find TypeScript files
 * - Use grep to search for imports
 * - Combine tools effectively
 * - Provide accurate final results
 */
export const easySearchScenario: EvalScenario = {
  id: 'easy-search',
  name: 'Find TypeScript files importing fs',
  description: 'Find all TypeScript (.ts) files that import the "fs" module',
  difficulty: 'easy',

  async setupWorkspace(): Promise<string> {
    // Return path to the static workspace directory
    return path.join(__dirname, 'workspace');
  },

  getTask(workspace: string): string {
    return `Find all TypeScript files (with .ts extension) in the workspace that import the "fs" module. The imports may be in different formats like:
- import fs from 'fs'
- import * as fs from 'fs'
- import { promises as fs } from 'fs'
- import something from 'fs/promises'

Make sure to only include .ts files, not .js files.`;
  },

  getResultSchema() {
    return z.object({
      files: z.array(z.string()).describe('List of TypeScript file paths (relative to workspace root) that import fs'),
    });
  },

  async validate(workspace: string, agentResponse: string, toolCalls: ToolCall[], structuredResult?: Record<string, unknown>): Promise<EvalResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    // Expected files (relative to workspace)
    const expectedFiles = new Set([
      'src/file-reader.ts',
      'src/file-writer.ts',
      'lib/utils.ts',
    ]);

    // Extract files from structured result
    const foundFiles = new Set<string>();

    if (structuredResult && Array.isArray(structuredResult.files)) {
      for (const file of structuredResult.files) {
        if (typeof file === 'string') {
          // Normalize path (remove leading ./)
          const normalized = file.replace(/^\.?\//, '');
          foundFiles.add(normalized);
        }
      }
    } else {
      errors.push('No structured result provided or invalid format');
    }

    // Calculate metrics
    const correctFiles = [...foundFiles].filter(f => expectedFiles.has(f));
    const missedFiles = [...expectedFiles].filter(f => !foundFiles.has(f));
    const extraFiles = [...foundFiles].filter(f => !expectedFiles.has(f));

    // Check for errors
    if (missedFiles.length > 0) {
      errors.push(`Missed files: ${missedFiles.join(', ')}`);
    }
    if (extraFiles.length > 0) {
      errors.push(`Incorrectly included files: ${extraFiles.join(', ')}`);
    }

    // Calculate score (F1 score)
    const precision = foundFiles.size > 0 ? correctFiles.length / foundFiles.size : 0;
    const recall = correctFiles.length / expectedFiles.size;
    const f1Score = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

    const success = missedFiles.length === 0 && extraFiles.length === 0;
    const toolCallCount = toolCalls.length;
    const efficient = toolCallCount <= 5; // Should be doable in 5 or fewer calls

    let details = `Found ${correctFiles.length}/${expectedFiles.size} correct files.\n`;
    if (success) {
      details += '✓ All correct files found!\n';
    } else {
      if (missedFiles.length > 0) {
        details += `✗ Missed: ${missedFiles.join(', ')}\n`;
      }
      if (extraFiles.length > 0) {
        details += `✗ Extra: ${extraFiles.join(', ')}\n`;
      }
    }
    details += `Tool calls: ${toolCallCount} (${efficient ? '✓ efficient' : '✗ could be more efficient'})\n`;
    details += `Precision: ${(precision * 100).toFixed(1)}%, Recall: ${(recall * 100).toFixed(1)}%, F1: ${(f1Score * 100).toFixed(1)}%`;

    return {
      success,
      score: f1Score,
      toolCalls: toolCallCount,
      toolCallDetails: toolCalls,
      errors,
      details,
      durationMs: Date.now() - startTime,
    };
  },

  async cleanupWorkspace(workspace: string): Promise<void> {
    // No cleanup needed - workspace is static
  },
};
