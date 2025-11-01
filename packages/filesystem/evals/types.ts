/**
 * Result of an agent tool call
 */
export interface ToolCall {
  name: string;
  input: Record<string, unknown>;
  output: string;
  success: boolean;
  error?: string;
}

/**
 * Result of an evaluation scenario
 */
export interface EvalResult {
  /** Whether the evaluation passed */
  success: boolean;
  /** Score from 0-1 */
  score: number;
  /** Number of tool calls made by the agent */
  toolCalls: number;
  /** List of tool calls made */
  toolCallDetails: ToolCall[];
  /** List of errors encountered */
  errors: string[];
  /** Human-readable details about the result */
  details: string;
  /** Time taken in milliseconds */
  durationMs: number;
}

/**
 * Definition of an evaluation scenario
 */
export interface EvalScenario {
  /** Unique identifier for the scenario */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description of what this scenario tests */
  description: string;
  /** Difficulty level */
  difficulty: 'easy' | 'medium' | 'hard';
  /**
   * Setup the test workspace
   * @returns Path to the workspace directory
   */
  setupWorkspace(): Promise<string>;
  /**
   * Get the task description for the agent
   * @param workspace Path to the workspace
   * @returns Task description string
   */
  getTask(workspace: string): string;
  /**
   * Get the Zod schema for structured result submission (optional)
   * @returns Zod schema or undefined
   */
  getResultSchema?(): any;
  /**
   * Validate the agent's result
   * @param workspace Path to the workspace
   * @param agentResponse The agent's final answer/response
   * @param toolCalls List of tool calls made
   * @param structuredResult Structured result from submit_result tool (optional)
   * @returns Evaluation result
   */
  validate(workspace: string, agentResponse: string, toolCalls: ToolCall[], structuredResult?: Record<string, unknown>): Promise<EvalResult>;
  /**
   * Cleanup the test workspace
   * @param workspace Path to the workspace
   */
  cleanupWorkspace(workspace: string): Promise<void>;
}

/**
 * Configuration for running an eval
 */
export interface EvalConfig {
  /** Model to use (e.g., "claude-3-5-sonnet-20241022") */
  model: string;
  /** Anthropic API key */
  apiKey: string;
  /** Maximum number of iterations for the agent */
  maxIterations?: number;
  /** Whether to print verbose output */
  verbose?: boolean;
  /** Zod schema for structured result submission (optional) */
  resultSchema?: any;
}
