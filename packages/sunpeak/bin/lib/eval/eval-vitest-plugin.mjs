/**
 * Vitest plugin that transforms .eval.ts files into runnable test suites.
 *
 * Each eval spec file gets transformed into a vitest test module that:
 * 1. Connects to the MCP server
 * 2. Discovers and converts tools
 * 3. Runs each case × model × N runs
 * 4. Reports aggregate pass/fail counts
 *
 * The original eval spec is re-imported via a virtual module (\0 prefix)
 * to avoid circular transformation. The virtual ID ends in .eval-spec.ts
 * so Vite's esbuild transform recognizes it as TypeScript.
 */

import { readFileSync } from 'fs';
import { basename } from 'path';
import { fileURLToPath } from 'url';

const EVAL_RE = /\.eval\.[tj]s$/;
const VIRTUAL_PREFIX = '\0sunpeak-eval-spec:';

/**
 * Create the vitest plugin for eval files.
 * @param {object} options
 * @param {string} options.server - MCP server URL or command
 * @param {string[]} options.models - Model IDs to test
 * @param {object} options.defaults - Default settings
 * @returns {import('vite').Plugin}
 */
export function evalVitestPlugin({ server, models, defaults }) {
  // Map virtual IDs back to real file paths
  const virtualToReal = new Map();

  return {
    name: 'sunpeak-eval',
    enforce: 'pre',

    resolveId(id) {
      // Resolve virtual spec imports — these bypass the transform
      if (id.startsWith(VIRTUAL_PREFIX)) {
        return id;
      }
      return null;
    },

    load(id) {
      if (!id.startsWith(VIRTUAL_PREFIX)) return null;
      const realPath = virtualToReal.get(id);
      if (!realPath) return null;
      return readFileSync(realPath, 'utf-8');
    },

    transform(code, id) {
      // Don't transform virtual modules
      if (id.startsWith(VIRTUAL_PREFIX)) return null;
      // Only transform eval spec files
      if (!EVAL_RE.test(id)) return null;

      // Register the virtual module mapping (use .ts extension so esbuild handles it)
      const virtualId = VIRTUAL_PREFIX + id;
      virtualToReal.set(virtualId, id);

      const testName = basename(id).replace(EVAL_RE, '');
      const runnerPath = resolveRunnerPath();

      const transformed = `
import { describe, it, beforeAll, afterAll } from 'vitest';
import { createMcpConnection, discoverAndConvertTools, runEvalCaseAggregate, checkAiSdkInstalled } from '${runnerPath}';

// Import the original eval spec via virtual module (bypasses this transform)
import evalSpec from ${JSON.stringify(virtualId)};

if (!evalSpec || !evalSpec.cases) {
  throw new Error('Eval file must use: export default defineEval({ cases: [...] })');
}

const SERVER = ${JSON.stringify(server)};
const MODELS = ${JSON.stringify(models)};
const DEFAULTS = ${JSON.stringify(defaults)};

// Use the eval-level model override, or fall back to config
const activeModels = evalSpec.models || MODELS;

// Skip entirely if no models configured
const shouldSkip = !activeModels || activeModels.length === 0;

describe.skipIf(shouldSkip)(${JSON.stringify(testName)}, () => {
  let client;
  let transport;
  let tools;

  beforeAll(async () => {
    await checkAiSdkInstalled();
    const conn = await createMcpConnection(SERVER);
    client = conn.client;
    transport = conn.transport;
    tools = await discoverAndConvertTools(client);
  });

  afterAll(async () => {
    try { await transport?.close?.(); } catch {}
  });

  for (const evalCase of evalSpec.cases) {
    describe(evalCase.name, () => {
      for (const modelId of activeModels) {
        const runs = evalSpec.runs ?? DEFAULTS.runs ?? 10;
        const threshold = evalSpec.threshold ?? DEFAULTS.threshold ?? 1.0;

        it(\`\${modelId} (\${runs} runs)\`, async () => {
          const result = await runEvalCaseAggregate({
            evalCase,
            modelId,
            tools,
            runs,
            maxSteps: DEFAULTS.maxSteps ?? 1,
            temperature: DEFAULTS.temperature ?? 0,
            timeout: DEFAULTS.timeout ?? 30000,
          });

          // Log statistical results for the reporter
          console.log('__SUNPEAK_EVAL__' + JSON.stringify({
            type: 'eval-result',
            ...result,
          }));

          // Assert pass rate meets threshold
          if (result.passRate < threshold) {
            const failureSummary = result.failures
              .map((f) => \`  \${f.error} (\${f.count}x)\`)
              .join('\\n');
            throw new Error(
              \`\${result.passed}/\${result.runs} passed (\${(result.passRate * 100).toFixed(0)}%), threshold \${(threshold * 100).toFixed(0)}%\\nFailures:\\n\${failureSummary}\`
            );
          }
        }, (DEFAULTS.timeout ?? 30000) * (evalSpec.runs ?? DEFAULTS.runs ?? 10) + 10000);
      }
    });
  }
});
`;

      return { code: transformed, map: null };
    },
  };
}

/**
 * Get the absolute path to the eval-runner module.
 */
function resolveRunnerPath() {
  const url = new URL('./eval-runner.mjs', import.meta.url);
  // fileURLToPath requires file:// scheme; fall back to pathname for other schemes (e.g., vitest)
  if (url.protocol === 'file:') {
    return fileURLToPath(url);
  }
  return url.pathname;
}
