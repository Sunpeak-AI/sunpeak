/**
 * Drift guard for the static sandbox HTML shipped at `dist/sandbox-proxy.html`.
 *
 * `scripts/generate-sandbox-html.mjs` duplicates two pieces of logic from this
 * package's TypeScript sources because it runs in plain Node at build time and
 * can't import .ts modules:
 *
 *   1. The proxy relay logic (from `src/inspector/sandbox-proxy.ts`)
 *   2. The mock OpenAI runtime (from `src/inspector/mock-openai-runtime.ts`)
 *
 * If the source changes and the script doesn't, embedders' sandbox proxies
 * drift away from the CLI sandbox server's behavior — subtle bugs that don't
 * reproduce in development. This test makes drift loud.
 *
 * The test skips when `dist/sandbox-proxy.html` doesn't exist (developer
 * hasn't run `pnpm build` yet). CI always builds before testing, so drift
 * shows up there.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MOCK_OPENAI_RUNTIME_SCRIPT } from './mock-openai-runtime';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST_HTML = resolve(__dirname, '..', '..', 'dist', 'sandbox-proxy.html');

describe('static sandbox HTML drift guard', () => {
  it.skipIf(!existsSync(DIST_HTML))('embeds the live MOCK_OPENAI_RUNTIME_SCRIPT verbatim', () => {
    const html = readFileSync(DIST_HTML, 'utf8');
    // The script is emitted as a JSON-stringified JS string in the generated
    // HTML (so it can be assigned to a JS variable safely). We check that
    // the same literal source appears inside the file. If `MOCK_OPENAI_RUNTIME_SCRIPT`
    // changes and the script doesn't get regenerated (or the duplicate copy
    // inside `scripts/generate-sandbox-html.mjs` drifts), this fails.
    expect(html).toContain(JSON.stringify(MOCK_OPENAI_RUNTIME_SCRIPT));
  });

  it.skipIf(!existsSync(DIST_HTML))(
    'declares the sandbox-proxy-ready notification (the proxy handshake)',
    () => {
      const html = readFileSync(DIST_HTML, 'utf8');
      expect(html).toContain('ui/notifications/sandbox-proxy-ready');
      expect(html).toContain('ui/notifications/sandbox-resource-ready');
      expect(html).toContain('sunpeak/sandbox-load-src');
      expect(html).toContain('sunpeak/fence');
    }
  );
});
