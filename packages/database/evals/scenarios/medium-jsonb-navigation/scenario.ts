import { Pool } from 'pg';
import { readFile } from 'fs/promises';
import { join } from 'path';
import type { EvalScenario, EvalResult, ToolCall } from '../../types';

const SCHEMA_NAME = 'eval_medium_jsonb_nav';

export const mediumJsonbNavigationScenario: EvalScenario = {
  id: 'medium-jsonb-navigation',
  name: 'JSONB Column Navigation',
  description:
    'Find information from a JSONB column in one table to fetch related data from another table',
  difficulty: 'medium',

  async setupWorkspace(): Promise<string> {
    const connectionString =
      process.env.TEST_DATABASE_URL ||
      'postgresql://postgres:postgres@localhost:5432/tests';

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
    return `Find all high-priority orders (where the metadata has priority set to "high") and return the product names and customer names for those orders. The orders table has a JSONB column called metadata that contains the product_id, and you'll need to join with the products table to get the product names.`;
  },

  async validate(
    connectionString: string,
    agentResponse: string,
    toolCalls: ToolCall[]
  ): Promise<EvalResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    // Expected results: orders with priority "high"
    const expectedResults = [
      { customer: 'John Doe', product: 'Laptop Pro' },
      { customer: 'Alice Williams', product: 'Monitor 27"' },
    ];

    // Verify the response contains all expected results
    let foundCount = 0;
    for (const result of expectedResults) {
      const hasCustomer = agentResponse.includes(result.customer);
      const hasProduct = agentResponse.includes(result.product);

      if (hasCustomer && hasProduct) {
        foundCount++;
      } else {
        errors.push(`Missing: ${result.customer} - ${result.product}`);
      }
    }

    // Check for false positives
    const excludedCustomers = ['Jane Smith', 'Bob Johnson', 'Charlie Brown'];
    for (const customer of excludedCustomers) {
      if (agentResponse.includes(customer)) {
        errors.push(`Incorrectly included: ${customer}`);
        foundCount--; // Penalize false positives
      }
    }

    const score = Math.max(0, foundCount) / expectedResults.length;
    const success = score === 1.0;

    return {
      success,
      score,
      toolCalls: toolCalls.length,
      toolCallDetails: toolCalls,
      errors,
      details: success
        ? `Found all ${expectedResults.length} high-priority orders`
        : `Found ${foundCount}/${expectedResults.length} results`,
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
