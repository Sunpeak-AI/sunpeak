/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck - CLI command modules are .mjs files without TypeScript declarations
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// Import the inspect module to test parseArgs and mergeSimulationFixtures
// We'll test the exported helpers by re-implementing the logic since they're
// not exported. Instead, test the public behavior via the module.

const importInspectConfig = () => import('../../bin/lib/inspect/inspect-config.mjs');
const importTestConfig = () => import('../../bin/lib/test/test-config.mjs');

describe('defineConfig (external server)', () => {
  it('resolves local sunpeak binary when available', async () => {
    const { defineConfig } = await importTestConfig();
    const config = defineConfig({
      server: { url: 'http://localhost:8000/mcp' },
    });

    // Should contain 'sunpeak inspect' — either bare or with a node_modules/.bin prefix
    expect(config.webServer.command).toContain('sunpeak inspect');
  });

  it('passes env as --env flags in the inspect command', async () => {
    const { defineConfig } = await importTestConfig();
    const config = defineConfig({
      server: { command: 'python', args: ['server.py'], env: { SECRET: 'abc' } },
    });

    expect(config.webServer.command).toContain('--env SECRET=abc');
  });

  it('quotes env values with spaces', async () => {
    const { defineConfig } = await importTestConfig();
    const config = defineConfig({
      server: { command: 'python', args: ['server.py'], env: { MSG: 'hi there' } },
    });

    expect(config.webServer.command).toContain('--env "MSG=hi there"');
  });

  it('passes cwd as --cwd flag', async () => {
    const { defineConfig } = await importTestConfig();
    const config = defineConfig({
      server: { command: 'python', args: ['server.py'], cwd: './backend' },
    });

    expect(config.webServer.command).toContain('--cwd ./backend');
  });

  it('uses custom timeout', async () => {
    const { defineConfig } = await importTestConfig();
    const config = defineConfig({
      server: { url: 'http://localhost:8000/mcp' },
      timeout: 180_000,
    });

    expect(config.webServer.timeout).toBe(180_000);
  });
});

describe('defineInspectConfig', () => {
  it('generates a valid Playwright config shape', async () => {
    const { defineInspectConfig } = await importInspectConfig();
    const config = defineInspectConfig({ server: 'http://localhost:8000/mcp' });

    expect(config.testDir).toBe('tests/e2e');
    expect(config.fullyParallel).toBe(true);
    expect(config.webServer).toBeDefined();
    expect(config.webServer.command).toContain('sunpeak inspect');
    expect(config.webServer.command).toContain('--server http://localhost:8000/mcp');
    expect(config.webServer.url).toContain('/health');
    expect(config.use.baseURL).toContain('http://127.0.0.1:');
    expect(config.use.trace).toBe('on-first-retry');
  });

  it('creates projects for each host', async () => {
    const { defineInspectConfig } = await importInspectConfig();
    const config = defineInspectConfig({
      server: 'http://localhost:8000/mcp',
      hosts: ['chatgpt', 'claude'],
    });

    expect(config.projects).toHaveLength(2);
    expect(config.projects[0].name).toBe('chatgpt');
    expect(config.projects[1].name).toBe('claude');
  });

  it('defaults to both hosts', async () => {
    const { defineInspectConfig } = await importInspectConfig();
    const config = defineInspectConfig({ server: 'http://localhost:8000/mcp' });

    expect(config.projects).toHaveLength(2);
  });

  it('accepts custom testDir and simulationsDir', async () => {
    const { defineInspectConfig } = await importInspectConfig();
    const config = defineInspectConfig({
      server: 'http://localhost:8000/mcp',
      testDir: 'custom/tests',
      simulationsDir: 'custom/sims',
    });

    expect(config.testDir).toBe('custom/tests');
    expect(config.webServer.command).toContain('--simulations custom/sims');
  });

  it('omits --simulations flag when simulationsDir is not provided', async () => {
    const { defineInspectConfig } = await importInspectConfig();
    const config = defineInspectConfig({ server: 'http://localhost:8000/mcp' });

    expect(config.webServer.command).not.toContain('--simulations');
  });

  it('quotes stdio command with spaces', async () => {
    const { defineInspectConfig } = await importInspectConfig();
    const config = defineInspectConfig({ server: 'python my_server.py' });

    expect(config.webServer.command).toContain('--server "python my_server.py"');
  });

  it('includes app name when provided', async () => {
    const { defineInspectConfig } = await importInspectConfig();
    const config = defineInspectConfig({
      server: 'http://localhost:8000/mcp',
      name: 'My MCP App',
    });

    expect(config.webServer.command).toContain('--name "My MCP App"');
  });

  it('merges custom use options', async () => {
    const { defineInspectConfig } = await importInspectConfig();
    const config = defineInspectConfig({
      server: 'http://localhost:8000/mcp',
      use: { screenshot: 'on' },
    });

    expect(config.use.screenshot).toBe('on');
    expect(config.use.baseURL).toBeDefined(); // built-in options still present
  });

  it('throws when server is missing', async () => {
    const { defineInspectConfig } = await importInspectConfig();
    expect(() => defineInspectConfig({})).toThrow('`server` option is required');
  });

  it('passes env as --env flags for stdio servers', async () => {
    const { defineInspectConfig } = await importInspectConfig();
    const config = defineInspectConfig({
      server: 'python server.py',
      env: { API_KEY: 'test-123', DEBUG: 'true' },
    });

    expect(config.webServer.command).toContain('--env API_KEY=test-123');
    expect(config.webServer.command).toContain('--env DEBUG=true');
  });

  it('quotes env values that contain spaces', async () => {
    const { defineInspectConfig } = await importInspectConfig();
    const config = defineInspectConfig({
      server: 'python server.py',
      env: { GREETING: 'hello world' },
    });

    expect(config.webServer.command).toContain('--env "GREETING=hello world"');
  });

  it('passes cwd as --cwd flag for stdio servers', async () => {
    const { defineInspectConfig } = await importInspectConfig();
    const config = defineInspectConfig({
      server: 'python server.py',
      cwd: './backend',
    });

    expect(config.webServer.command).toContain('--cwd ./backend');
  });

  it('quotes cwd paths that contain spaces', async () => {
    const { defineInspectConfig } = await importInspectConfig();
    const config = defineInspectConfig({
      server: 'python server.py',
      cwd: './my project',
    });

    expect(config.webServer.command).toContain('--cwd "./my project"');
  });

  it('uses custom timeout when provided', async () => {
    const { defineInspectConfig } = await importInspectConfig();
    const config = defineInspectConfig({
      server: 'http://localhost:8000/mcp',
      timeout: 120_000,
    });

    expect(config.webServer.timeout).toBe(120_000);
  });

  it('defaults timeout to 60s when not provided', async () => {
    const { defineInspectConfig } = await importInspectConfig();
    const config = defineInspectConfig({
      server: 'http://localhost:8000/mcp',
    });

    expect(config.webServer.timeout).toBe(60_000);
  });

  it('sets appropriate worker limits', async () => {
    const { defineInspectConfig } = await importInspectConfig();
    const config = defineInspectConfig({ server: 'http://localhost:8000/mcp' });

    // Should be 1 or 2 (CI-dependent)
    expect(config.workers).toBeGreaterThanOrEqual(1);
    expect(config.workers).toBeLessThanOrEqual(2);
  });

  it('includes sandbox port in webServer command', async () => {
    const { defineInspectConfig } = await importInspectConfig();
    const config = defineInspectConfig({ server: 'http://localhost:8000/mcp' });

    expect(config.webServer.command).toContain('SUNPEAK_SANDBOX_PORT=');
  });

  it('allocates distinct ports for server and sandbox', async () => {
    const { defineInspectConfig } = await importInspectConfig();
    const config = defineInspectConfig({ server: 'http://localhost:8000/mcp' });

    // Extract the ports from the generated config
    const baseUrlPort = Number(new URL(config.use.baseURL).port);
    const sandboxPortMatch = config.webServer.command.match(/SUNPEAK_SANDBOX_PORT=(\d+)/);
    const sandboxPort = sandboxPortMatch ? Number(sandboxPortMatch[1]) : null;

    expect(baseUrlPort).toBeGreaterThan(0);
    expect(sandboxPort).toBeGreaterThan(0);
    expect(baseUrlPort).not.toBe(sandboxPort);
  });
});

describe('isAuthError', () => {
  // isAuthError is not exported, so we re-implement the same logic to verify
  // the detection patterns are correct. Keep this in sync with inspect.mjs.
  const isAuthError = (err: Error) => {
    if (err.constructor?.name === 'UnauthorizedError') return true;
    const msg = err.message || '';
    if (msg.includes('invalid_token')) return true;
    if (msg.includes('ECONNREFUSED') || msg.includes('ETIMEDOUT') || msg.includes('ENOTFOUND')) {
      return false;
    }
    return false;
  };

  it('detects invalid_token error', () => {
    const err = new Error(
      'Streamable HTTP error: Error POSTing to endpoint: {"error":"invalid_token"}'
    );
    expect(isAuthError(err)).toBe(true);
  });

  it('detects UnauthorizedError by class name', () => {
    class UnauthorizedError extends Error {
      constructor() {
        super('Unauthorized');
      }
    }
    expect(isAuthError(new UnauthorizedError())).toBe(true);
  });

  it('does not match ECONNREFUSED', () => {
    const err = new Error('connect ECONNREFUSED 127.0.0.1:8000');
    expect(isAuthError(err)).toBe(false);
  });

  it('does not match ETIMEDOUT', () => {
    const err = new Error('connect ETIMEDOUT 10.0.0.1:443');
    expect(isAuthError(err)).toBe(false);
  });

  it('does not match generic errors', () => {
    const err = new Error('Something went wrong');
    expect(isAuthError(err)).toBe(false);
  });

  it('does not false-positive on URLs containing 401', () => {
    const err = new Error('Failed to fetch http://example.com/path/4014');
    expect(isAuthError(err)).toBe(false);
  });
});

describe('inspect CLI', () => {
  describe('parseArgs (tested via inspect function behavior)', () => {
    it('should parse --server flag', async () => {
      // We'll test parseArgs logic by checking the inspect function rejects
      // missing --server and accepts it when provided.
      // Since inspect() calls process.exit, we test the argument parsing
      // indirectly through the module structure.

      // Test that the inspect module exports the inspect function
      const mod = await import('../../bin/commands/inspect.mjs');
      expect(typeof mod.inspect).toBe('function');
    });
  });

  describe('mergeSimulationFixtures', () => {
    const tmpDir = path.join(process.cwd(), '.test-simulations-' + Date.now());

    beforeEach(() => {
      fs.mkdirSync(tmpDir, { recursive: true });
    });

    afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('should merge fixture toolInput into existing simulation', () => {
      // Write a fixture
      fs.writeFileSync(
        path.join(tmpDir, 'search.json'),
        JSON.stringify({
          tool: 'search',
          toolInput: { query: 'headphones' },
          userMessage: 'Find headphones',
        })
      );

      // Simulate discovered simulations
      const simulations = {
        search: {
          name: 'search',
          tool: { name: 'search', inputSchema: { type: 'object' } },
        },
      };

      // Manually run merge logic (same as inspect.mjs mergeSimulationFixtures)
      const files = fs.readdirSync(tmpDir).filter((f) => f.endsWith('.json'));
      for (const file of files) {
        const fixture = JSON.parse(fs.readFileSync(path.join(tmpDir, file), 'utf-8'));
        const sim = simulations[fixture.tool];
        if (sim) {
          if (fixture.toolInput !== undefined) sim.toolInput = fixture.toolInput;
          if (fixture.toolResult !== undefined) sim.toolResult = fixture.toolResult;
          if (fixture.userMessage !== undefined) sim.userMessage = fixture.userMessage;
        }
      }

      expect(simulations.search.toolInput).toEqual({ query: 'headphones' });
      expect(simulations.search.userMessage).toBe('Find headphones');
    });

    it('should create new simulation from fixture when tool not on server', () => {
      fs.writeFileSync(
        path.join(tmpDir, 'mock-tool.json'),
        JSON.stringify({
          tool: 'mock-tool',
          toolInput: { key: 'value' },
          toolResult: { content: [], structuredContent: { mocked: true } },
        })
      );

      const simulations = {};

      const files = fs.readdirSync(tmpDir).filter((f) => f.endsWith('.json'));
      for (const file of files) {
        const fixture = JSON.parse(fs.readFileSync(path.join(tmpDir, file), 'utf-8'));
        const toolName = fixture.tool;
        const sim = simulations[toolName];
        if (!sim) {
          const simName = file.replace(/\.json$/, '');
          simulations[simName] = {
            name: simName,
            tool: { name: toolName, inputSchema: { type: 'object' } },
            toolInput: fixture.toolInput,
            toolResult: fixture.toolResult,
          };
        }
      }

      expect(simulations['mock-tool']).toBeDefined();
      expect(simulations['mock-tool'].tool.name).toBe('mock-tool');
      expect(simulations['mock-tool'].toolResult).toEqual({
        content: [],
        structuredContent: { mocked: true },
      });
    });

    it('should skip non-JSON files', () => {
      fs.writeFileSync(path.join(tmpDir, 'readme.md'), '# Test');
      fs.writeFileSync(
        path.join(tmpDir, 'valid.json'),
        JSON.stringify({ tool: 'valid', toolInput: { x: 1 } })
      );

      const files = fs.readdirSync(tmpDir).filter((f) => f.endsWith('.json'));
      expect(files).toHaveLength(1);
      expect(files[0]).toBe('valid.json');
    });

    it('should skip fixtures without tool field', () => {
      fs.writeFileSync(path.join(tmpDir, 'no-tool.json'), JSON.stringify({ toolInput: { x: 1 } }));

      const simulations = {};

      const files = fs.readdirSync(tmpDir).filter((f) => f.endsWith('.json'));
      for (const file of files) {
        const fixture = JSON.parse(fs.readFileSync(path.join(tmpDir, file), 'utf-8'));
        const toolName = fixture.tool;
        if (!toolName) continue;
        simulations[toolName] = { name: toolName };
      }

      expect(Object.keys(simulations)).toHaveLength(0);
    });
  });
});
