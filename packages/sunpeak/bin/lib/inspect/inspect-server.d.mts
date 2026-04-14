/**
 * Start the sunpeak inspector server programmatically.
 *
 * Connects to the provided MCP server, discovers tools and resources,
 * and serves the inspector UI on the specified port.
 */
export function inspectServer(opts: {
  /** MCP server URL or stdio command. */
  server: string;
  /** Path to simulation fixtures directory. */
  simulationsDir?: string | null;
  /** Dev server port (default: 3000). */
  port?: number;
  /** App name in inspector chrome. */
  name?: string;
  /** Existing sandbox server URL (skips creating one). */
  sandboxUrl?: string;
  /** If true, show framework-only controls (Prod Resources). */
  frameworkMode?: boolean;
  /** Initial prod resources state. */
  defaultProdResources?: boolean;
  /** Project directory for serving /dist/ files (prod resources). */
  projectRoot?: string | null;
  /** Whether to open browser (default: !CI). */
  open?: boolean;
  /** Additional cleanup callback on exit. */
  onCleanup?: () => Promise<void>;
  /** Extra environment variables for stdio server processes. */
  env?: Record<string, string>;
  /** Working directory for stdio server processes. */
  cwd?: string;
}): Promise<void>;
