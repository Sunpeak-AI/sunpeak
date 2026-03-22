export interface InspectConfigOptions {
  /** MCP server URL or stdio command string (required) */
  server: string;
  /** Test directory (default: 'tests/e2e') */
  testDir?: string;
  /** Simulation JSON directory (opt-in, fixtures loaded only when specified) */
  simulationsDir?: string;
  /** Host shells to test (default: ['chatgpt', 'claude']) */
  hosts?: ('chatgpt' | 'claude')[];
  /** App name in simulator chrome */
  name?: string;
  /** Additional Playwright `use` options */
  use?: Record<string, unknown>;
}

/**
 * Create a complete Playwright config for testing an external MCP server
 * using the sunpeak simulator.
 */
export function defineInspectConfig(options: InspectConfigOptions): Record<string, unknown>;
