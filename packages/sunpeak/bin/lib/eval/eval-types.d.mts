/**
 * Result from a single eval run, containing the model's tool calls and response.
 */
export interface EvalRunResult {
  /** All tool calls the model made across all steps. */
  toolCalls: Array<{
    name: string;
    args: Record<string, unknown>;
  }>;
  /** All tool results returned. */
  toolResults: Array<unknown>;
  /** Final text response from the model. */
  text: string;
  /** Per-step breakdown. */
  steps: Array<{
    toolCalls: Array<{ name: string; args: Record<string, unknown> }>;
    toolResults: Array<unknown>;
    text: string;
  }>;
  /** Token usage. */
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  /** Why the model stopped. */
  finishReason: string;
}

/**
 * Expected tool call assertion.
 */
export interface ToolExpectation {
  /** Expected tool name. */
  tool: string;
  /** Expected arguments (partial match). */
  args?: Record<string, unknown>;
}

/**
 * A single eval test case.
 */
export interface EvalCase {
  /** Name of this test case. */
  name: string;
  /** The prompt to send to the model. */
  prompt: string;
  /** Maximum tool call steps (default: from config or 1). */
  maxSteps?: number;
  /** Expected tool call (single). */
  expect?: ToolExpectation | ToolExpectation[];
  /** Custom assertion function. */
  assert?: (result: EvalRunResult) => void;
}

/**
 * An eval spec defined via defineEval().
 */
export interface EvalSpec {
  /** Override model list for this eval (defaults to config). */
  models?: string[];
  /** Override run count for this eval (defaults to config). */
  runs?: number;
  /** Pass threshold (0-1). Defaults to config or 1.0. */
  threshold?: number;
  /** Test cases. */
  cases: EvalCase[];
}

/**
 * Eval configuration defined via defineEvalConfig().
 */
export interface EvalConfig {
  /** MCP server URL or stdio command. Omit for sunpeak projects (auto-detected). */
  server?: string;
  /** Model IDs to test against. */
  models: string[];
  /** Default settings. */
  defaults?: {
    /** Number of times to run each case per model. Default: 10. */
    runs?: number;
    /** Maximum tool call steps. Default: 1. */
    maxSteps?: number;
    /** Model temperature. Default: 0. */
    temperature?: number;
    /** Timeout per run in milliseconds. Default: 30000. */
    timeout?: number;
    /** Pass threshold (0-1). Default: 1.0. */
    threshold?: number;
  };
}

/**
 * Aggregated results for one eval case across all runs of one model.
 */
export interface EvalCaseResult {
  caseName: string;
  modelId: string;
  runs: number;
  passed: number;
  failed: number;
  passRate: number;
  avgDurationMs: number;
  failures: Array<{
    error: string;
    count: number;
  }>;
}

/**
 * Define an eval spec.
 */
export declare function defineEval(spec: EvalSpec): EvalSpec;

/**
 * Define eval configuration.
 */
export declare function defineEvalConfig(config: EvalConfig): EvalConfig;

/**
 * Check expectations against an eval run result.
 * Throws if the result does not match the expected tool calls.
 */
export declare function checkExpectations(
  result: EvalRunResult,
  evalCase: EvalCase,
): void;

/**
 * Connect to an MCP server and return a client + transport.
 * @param serverUrl - MCP server URL (e.g., 'http://localhost:8000/mcp')
 */
export declare function createMcpConnection(
  serverUrl: string,
): Promise<{ client: unknown; transport: { close?: () => Promise<void> } }>;

/**
 * Discover tools from an MCP server client and convert them to AI SDK tool format.
 * @param client - MCP SDK Client instance (from createMcpConnection)
 */
export declare function discoverAndConvertTools(
  client: unknown,
): Promise<Record<string, unknown>>;

/**
 * Run a single eval case against a model, returning the normalized result.
 */
export declare function runSingleEval(params: {
  prompt: string;
  model: unknown;
  tools: Record<string, unknown>;
  maxSteps: number;
  temperature: number;
  timeout: number;
}): Promise<EvalRunResult>;

/**
 * Run an eval case multiple times against a model and return aggregated results.
 */
export declare function runEvalCaseAggregate(params: {
  evalCase: EvalCase;
  modelId: string;
  tools: Record<string, unknown>;
  runs: number;
  maxSteps: number;
  temperature: number;
  timeout: number;
}): Promise<EvalCaseResult>;
