#!/usr/bin/env tsx

/**
 * Eval runner for database tools
 * Runs evaluation scenarios to test agent performance with database tools
 */

import 'dotenv/config';
import { runAgent } from './agent';
import { listScenarios, getScenario } from './scenarios';
import type { EvalResult } from './types';

interface RunnerConfig {
  apiKey: string;
  scenarios?: string[]; // If not provided, run all scenarios
  model?: string;
}

async function main() {
  // Get API key from environment
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('Error: ANTHROPIC_API_KEY environment variable is required');
    console.error('Set it in a .env file or as an environment variable');
    process.exit(1);
  }

  // Parse command line args
  const args = process.argv.slice(2);
  const scenarioFilter = args.length > 0 ? args : undefined;

  const config: RunnerConfig = {
    apiKey,
    scenarios: scenarioFilter,
    model: process.env.MODEL
  };

  console.log('Database Tools Evaluation Runner');
  console.log('='.repeat(80));
  console.log(`Model: ${config.model}`);
  console.log(
    `Scenarios: ${config.scenarios?.join(', ') || 'all'}`
  );
  console.log('='.repeat(80));
  console.log('');

  // Get scenarios to run
  const allScenarios = listScenarios();
  const scenariosToRun = config.scenarios
    ? config.scenarios
        .map((id) => getScenario(id))
        .filter((s): s is NonNullable<typeof s> => s !== undefined)
    : allScenarios;

  if (scenariosToRun.length === 0) {
    console.error('No scenarios found to run');
    process.exit(1);
  }

  // Run each scenario
  const results: Array<{ scenario: string; result: EvalResult }> = [];

  for (const scenario of scenariosToRun) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`Scenario: ${scenario.name} (${scenario.id})`);
    console.log(`Difficulty: ${scenario.difficulty}`);
    console.log(`Description: ${scenario.description}`);
    console.log('-'.repeat(80));

    try {
      // Setup workspace
      console.log('Setting up database...');
      const connectionString = await scenario.setupWorkspace();

      // Get task
      const task = scenario.getTask(connectionString);
      console.log(`\nTask: ${task}\n`);

      // Run agent
      console.log('Running agent...');
      const startTime = Date.now();
      const agentResult = await runAgent(task, {
        apiKey: config.apiKey,
        model: config.model,
        connectionString,
        maskPII: false,
      });
      const runDuration = Date.now() - startTime;

      console.log(`\nAgent completed in ${runDuration}ms`);
      console.log(`Tool calls: ${agentResult.toolCalls.length}`);
      console.log(`\nAgent response:\n${agentResult.response}\n`);

      // Display tool calls
      console.log('Tool calls made:');
      for (const [index, call] of agentResult.toolCalls.entries()) {
        console.log(
          `  ${index + 1}. ${call.toolName}(${JSON.stringify(call.input)})`
        );
      }
      console.log('');

      // Validate result
      console.log('Validating result...');
      const evalResult = await scenario.validate(
        connectionString,
        agentResult.response,
        agentResult.toolCalls
      );

      // Display result
      console.log('\nEvaluation Result:');
      console.log(`  Success: ${evalResult.success ? '✓' : '✗'}`);
      console.log(`  Score: ${(evalResult.score * 100).toFixed(1)}%`);
      console.log(`  Details: ${evalResult.details}`);
      if (evalResult.errors.length > 0) {
        console.log(`  Errors:`);
        for (const error of evalResult.errors) {
          console.log(`    - ${error}`);
        }
      }

      results.push({
        scenario: scenario.id,
        result: evalResult,
      });

      // Cleanup
      console.log('\nCleaning up...');
      await scenario.cleanupWorkspace(connectionString);
    } catch (error) {
      console.error(`\nError running scenario: ${error}`);
      if (error instanceof Error) {
        console.error(error.stack);
      }

      results.push({
        scenario: scenario.id,
        result: {
          success: false,
          score: 0,
          toolCalls: 0,
          toolCallDetails: [],
          errors: [error instanceof Error ? error.message : String(error)],
          details: 'Scenario failed with error',
          durationMs: 0,
        },
      });
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log('');

  const passedCount = results.filter((r) => r.result.success).length;
  const totalCount = results.length;
  const avgScore =
    results.reduce((sum, r) => sum + r.result.score, 0) / totalCount;

  console.log(`Scenarios: ${passedCount}/${totalCount} passed`);
  console.log(`Average Score: ${(avgScore * 100).toFixed(1)}%`);
  console.log('');

  console.log('Individual Results:');
  for (const { scenario, result } of results) {
    const status = result.success ? '✓' : '✗';
    const score = (result.score * 100).toFixed(1);
    console.log(`  ${status} ${scenario}: ${score}% (${result.toolCalls} tool calls)`);
  }

  console.log('\n' + '='.repeat(80));

  // Exit with appropriate code
  process.exit(passedCount === totalCount ? 0 : 1);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
