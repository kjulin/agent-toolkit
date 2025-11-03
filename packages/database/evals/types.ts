/**
 * Types for database tool evaluations
 */

/**
 * Information about a tool call made by the agent
 */
export interface ToolCall {
  toolName: string;
  input: Record<string, any>;
  output: string;
  timestamp: number;
}

/**
 * Result from running an evaluation scenario
 */
export interface EvalResult {
  /** Whether the evaluation passed */
  success: boolean;
  /** Score from 0-1 indicating quality of result */
  score: number;
  /** Number of tool calls made */
  toolCalls: number;
  /** Details of each tool call */
  toolCallDetails: ToolCall[];
  /** Any errors encountered */
  errors: string[];
  /** Human-readable details about the evaluation */
  details: string;
  /** Time taken to complete in milliseconds */
  durationMs: number;
}

/**
 * Defines an evaluation scenario
 */
export interface EvalScenario {
  /** Unique identifier for this scenario */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description of what this scenario tests */
  description: string;
  /** Difficulty level */
  difficulty: 'easy' | 'medium' | 'hard';

  /**
   * Sets up the database workspace for this scenario
   * @returns Connection string for the test database
   */
  setupWorkspace(): Promise<string>;

  /**
   * Gets the task prompt for the agent
   * @param connectionString Connection string for the database
   * @returns Task description for the agent
   */
  getTask(connectionString: string): string;

  /**
   * Validates the agent's response and tool usage
   * @param connectionString Connection string for the database
   * @param agentResponse Final text response from the agent
   * @param toolCalls All tool calls made during execution
   * @returns Evaluation result
   */
  validate(
    connectionString: string,
    agentResponse: string,
    toolCalls: ToolCall[]
  ): Promise<EvalResult>;

  /**
   * Cleans up the database workspace
   * @param connectionString Connection string for the database
   */
  cleanupWorkspace(connectionString: string): Promise<void>;
}
