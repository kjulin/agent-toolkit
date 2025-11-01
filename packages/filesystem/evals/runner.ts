import { config } from 'dotenv';
import { runAgent } from './agent';
import { getScenario, getAvailableScenarios } from './scenarios';
import type { EvalConfig } from './types';

// Load environment variables from .env file
config();

/**
 * Main eval runner
 */
async function main() {
  // Parse command line args
  const scenarioId = process.argv[2] || 'easy-search';
  const verbose = process.argv.includes('--verbose') || process.argv.includes('-v');

  // Get configuration from environment
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('Error: ANTHROPIC_API_KEY environment variable not set');
    console.error('Please set it with: export ANTHROPIC_API_KEY=your-key');
    process.exit(1);
  }

  // Load scenario
  const scenario = getScenario(scenarioId);
  if (!scenario) {
    console.error(`Error: Scenario "${scenarioId}" not found`);
    console.error(`Available scenarios: ${getAvailableScenarios().join(', ')}`);
    process.exit(1);
  }

  const config: EvalConfig = {
    model: process.env.EVAL_MODEL || 'claude-sonnet-4-5',
    apiKey,
    maxIterations: parseInt(process.env.EVAL_MAX_ITERATIONS || '30'),
    verbose,
    resultSchema: scenario.getResultSchema?.(),
  };

  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log(`║  FILESYSTEM TOOLKIT EVALUATION`);
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  console.log(`📋 Scenario: ${scenario.name}`);
  console.log(`📝 Description: ${scenario.description}`);
  console.log(`🎯 Difficulty: ${scenario.difficulty}`);
  console.log(`🤖 Model: ${config.model}`);
  console.log(`🔄 Max iterations: ${config.maxIterations}`);
  console.log('');

  let workspace: string | null = null;

  try {
    // Setup workspace
    console.log('⚙️  Setting up workspace...');
    workspace = await scenario.setupWorkspace();
    console.log(`✓ Workspace ready: ${workspace}`);
    console.log('');

    // Get task
    const task = scenario.getTask(workspace);
    console.log('📋 Task:');
    console.log(task.split('\n').map(line => `   ${line}`).join('\n'));
    console.log('');

    // Run agent
    const startTime = Date.now();
    console.log('🚀 Running agent...');
    console.log('');

    const agentResult = await runAgent(task, workspace, config);

    if (!agentResult.success) {
      console.error(`\n❌ Agent failed: ${agentResult.error}`);
      process.exit(1);
    }

    const agentDuration = Date.now() - startTime;

    if (!verbose) {
      console.log(`✓ Agent completed in ${(agentDuration / 1000).toFixed(2)}s`);
      console.log(`  Tool calls: ${agentResult.toolCalls.length}`);
      console.log('');
    }

    // Validate results
    console.log('🔍 Validating results...');
    const evalResult = await scenario.validate(workspace, agentResult.response, agentResult.toolCalls, agentResult.structuredResult);

    // Print results
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log(`║  EVALUATION RESULTS`);
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    console.log(`${evalResult.success ? '✅ PASSED' : '❌ FAILED'}`);
    console.log('');
    console.log(`Score: ${(evalResult.score * 100).toFixed(1)}%`);
    console.log(`Tool Calls: ${evalResult.toolCalls}`);
    console.log(`Duration: ${(agentDuration / 1000).toFixed(2)}s`);
    console.log('');

    console.log('Details:');
    console.log(evalResult.details.split('\n').map(line => `  ${line}`).join('\n'));
    console.log('');

    if (evalResult.errors.length > 0) {
      console.log('Errors:');
      for (const error of evalResult.errors) {
        console.log(`  ❌ ${error}`);
      }
      console.log('');
    }

    // Show agent's final response
    console.log('Agent Response:');
    console.log('─'.repeat(70));
    console.log(agentResult.response);
    console.log('─'.repeat(70));
    console.log('');

    // Cleanup
    console.log('🧹 Cleaning up...');
    await scenario.cleanupWorkspace(workspace);
    console.log('✓ Cleanup complete');
    console.log('');

    // Exit with appropriate code
    process.exit(evalResult.success ? 0 : 1);
  } catch (error) {
    console.error('\n❌ Evaluation failed:');
    console.error(error);

    // Cleanup on error
    if (workspace) {
      try {
        await scenario.cleanupWorkspace(workspace);
      } catch (cleanupError) {
        console.error('Failed to cleanup workspace:', cleanupError);
      }
    }

    process.exit(1);
  }
}

// Run the main function
main();
