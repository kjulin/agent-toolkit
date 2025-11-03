import { Pool } from 'pg';
import { readFile } from 'fs/promises';
import { join } from 'path';
import type { EvalScenario, EvalResult, ToolCall } from '../../types';

const SCHEMA_NAME = 'eval_easy_column_fetch';

export const easyColumnFetchScenario: EvalScenario = {
  id: 'easy-column-fetch',
  name: 'Simple Column Fetch',
  description:
    'Fetch simple information from a table column using a WHERE clause',
  difficulty: 'easy',

  async setupWorkspace(): Promise<string> {
    const connectionString =
      process.env.TEST_DATABASE_URL ||
      'postgresql://postgres:postgres@localhost:5432/agentevals';

    const pool = new Pool({ connectionString });

    try {
      // Read and execute seed SQL
      const seedSql = await readFile(join(__dirname, 'seed.sql'), 'utf-8');
      await pool.query(seedSql);

      return connectionString;
    } finally {
      await pool.end();
    }
  },

  getTask(connectionString: string): string {
    return `Find all active employees in the Engineering department who earn more than $100,000 per year. Return their names and salaries.`;
  },

  async validate(
    connectionString: string,
    agentResponse: string,
    toolCalls: ToolCall[]
  ): Promise<EvalResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    // Expected results - just check for names
    const expectedNames = [
      'Alice Johnson',
      'Bob Smith',
      'Eve Davis',
      'Henry Wilson',
    ];

    // Verify the response contains all expected employee names
    let foundCount = 0;
    for (const name of expectedNames) {
      if (agentResponse.includes(name)) {
        foundCount++;
      } else {
        errors.push(`Missing employee: ${name}`);
      }
    }

    // Check for false positives (employees that shouldn't be included)
    const excludedNames = [
      'Carol White',
      'David Brown',
      'Frank Miller',
      'Grace Lee',
    ];
    for (const name of excludedNames) {
      if (agentResponse.includes(name)) {
        errors.push(`Incorrectly included: ${name}`);
        foundCount--; // Penalize false positives
      }
    }

    const score = Math.max(0, foundCount) / expectedNames.length;
    const success = score === 1.0;

    return {
      success,
      score,
      toolCalls: toolCalls.length,
      toolCallDetails: toolCalls,
      errors,
      details: success
        ? `Found all ${expectedNames.length} employees`
        : `Found ${foundCount}/${expectedNames.length} employees`,
      durationMs: Date.now() - startTime,
    };
  },

  async cleanupWorkspace(connectionString: string): Promise<void> {
    const pool = new Pool({ connectionString });
    try {
      await pool.query(`DROP SCHEMA IF EXISTS ${SCHEMA_NAME} CASCADE`);
    } finally {
      await pool.end();
    }
  },
};
