---
name: test-mcp-server
description: Use when testing MCP servers -- e2e tests with the sunpeak inspector, visual regression testing, live testing against real ChatGPT, multi-model evals, Playwright configuration, or scaffolding test infrastructure with "sunpeak test init". Works with any MCP server (Python, Go, TypeScript, etc.), not just sunpeak projects.
---

# Test MCP Server

sunpeak includes a testing framework that works with any MCP server, regardless of language or framework. It provides four testing layers: e2e tests (inspector-based), visual regression, live tests (against real ChatGPT), and evals (multi-model tool calling).

For sunpeak app projects, testing integrates automatically. For non-sunpeak MCP servers (Python, Go, Rust, etc.), `sunpeak test init` scaffolds a self-contained test directory.

## Getting Started

```bash
sunpeak test init                        # Interactive setup (detects project type)
sunpeak test init --server http://localhost:8000/mcp  # URL-based server
sunpeak test init --server "python server.py"         # Command-based server
```

`sunpeak test init` detects three project types:
- **sunpeak projects** -- Adds `defineConfig()` and eval boilerplate
- **JS/TS projects** -- Adds Playwright config, smoke test, and evals at project root
- **Non-JS projects** -- Creates a self-contained `tests/sunpeak/` directory with its own `package.json`

## Getting Reference Code

Clone the sunpeak repo for working test examples:

```bash
git clone --depth 1 https://github.com/Sunpeak-AI/sunpeak /tmp/sunpeak
```

Test examples live at `/tmp/sunpeak/packages/sunpeak/template/tests/`. This includes e2e tests, simulations, evals, and live tests.

## Commands

```bash
sunpeak inspect              # Inspect any MCP server in the inspector (standalone)
sunpeak test                 # Run unit + e2e tests
sunpeak test --unit          # Run unit tests only (vitest)
sunpeak test --e2e           # Run e2e tests only (Playwright)
sunpeak test --visual        # Run e2e tests with visual regression comparison
sunpeak test --visual --update  # Update visual regression baselines
sunpeak test init            # Scaffold test infrastructure into a project
sunpeak test --live          # Run live tests against real ChatGPT (requires tunnel + browser session)
sunpeak test --eval          # Run evals against multiple LLM models (requires API keys)
```

Flags are additive: `--unit --e2e --live --eval` runs all four. `--update` implies `--visual`. `--eval` and `--live` are never included in the default run (they cost money).

## E2E Tests with the `mcp` Fixture

Import `test` and `expect` from `sunpeak/test`. The `mcp` fixture handles inspector navigation, double-iframe traversal, URL construction, and host selection. Tests run automatically across ChatGPT and Claude hosts via Playwright projects.

```typescript
import { test, expect } from 'sunpeak/test';

test('renders weather card', async ({ mcp }) => {
  const result = await mcp.callTool('show-weather');
  const app = result.app();
  await expect(app.locator('h1')).toHaveText('Austin');
});

test('renders in dark mode', async ({ mcp }) => {
  const result = await mcp.callTool('show-weather', {}, { theme: 'dark' });
  const app = result.app();
  await expect(app.locator('h1')).toBeVisible();
});

test('loads without console errors', async ({ mcp }) => {
  const errors: string[] = [];
  mcp.page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  const result = await mcp.callTool('show-weather', {}, { theme: 'dark' });
  const app = result.app();
  await expect(app.locator('h1')).toBeVisible();

  const unexpectedErrors = errors.filter(
    (e) =>
      !e.includes('[IframeResource]') &&
      !e.includes('mcp') &&
      !e.includes('PostMessage') &&
      !e.includes('connect')
  );
  expect(unexpectedErrors).toHaveLength(0);
});

test('prod tools empty state', async ({ mcp }) => {
  await mcp.openTool('show-weather');
  await expect(mcp.page.locator('text=Press Run to call the tool')).toBeVisible();
});

test('pip mode (skip on Claude)', async ({ mcp }) => {
  test.skip(mcp.host === 'claude', 'Claude does not support PiP');
  const result = await mcp.callTool('show-weather');
  await mcp.setDisplayMode('pip');
  await expect(result.app().locator('h1')).toBeVisible({ timeout: 5000 });
});
```

### `mcp` Fixture API

| Method | Description |
|--------|-------------|
| `callTool(name, input?, options?)` | Navigate to simulation, wait for render, return `ToolResult` |
| `openTool(name, options?)` | Navigate to tool with no mock data ("Press Run" state) |
| `runTool()` | Click Run button, wait for resource, return `ToolResult` |
| `setTheme(theme)` | Switch to `'light'` or `'dark'` via sidebar |
| `setDisplayMode(mode)` | Switch to `'inline'`, `'pip'`, or `'fullscreen'` via sidebar |
| `screenshot(name?, options?)` | Take a screenshot and compare against a baseline (only runs with `--visual`) |
| `page` | Raw Playwright `Page` for chrome-level assertions |
| `host` | Current host ID (`'chatgpt'` or `'claude'`) from Playwright project |

### `ToolResult` API

| Property/Method | Description |
|--------|-------------|
| `app()` | Get FrameLocator for rendered resource UI (handles double-iframe) |
| `content` | Raw MCP content items |
| `structuredContent` | Structured content from tool response |
| `isError` | Whether the tool returned an error |

### MCP-Native Matchers

| Matcher | Description |
|---------|-------------|
| `expect(result).toBeError()` | Assert tool result is an error |
| `expect(result).toHaveTextContent(str)` | Assert any content text contains string |
| `expect(result).toHaveStructuredContent(shape)` | Assert structuredContent matches shape |
| `expect(result).toHaveContentType(type)` | Assert content includes item of given type |

### `callTool` Options

| Option | Type | Description |
|--------|------|-------------|
| `theme` | `'light' \| 'dark'` | Color theme (default: inspector default) |
| `displayMode` | `'inline' \| 'pip' \| 'fullscreen'` | Display mode |
| `prodResources` | `boolean` | Use production-built resource bundles |

### Visual Regression Testing

Use `mcp.screenshot()` to capture and compare screenshots against saved baselines. Comparisons only run with `sunpeak test --visual`. Without it, `screenshot()` silently skips, so you can include it in regular e2e tests.

```typescript
import { test, expect } from 'sunpeak/test';

test('albums renders correctly', async ({ mcp }) => {
  const result = await mcp.callTool('show-albums', {}, { theme: 'light' });
  const app = result.app();
  await expect(app.locator('button:has-text("Summer Slice")')).toBeVisible();

  await mcp.screenshot('albums-light');
});
```

`screenshot()` options:

| Option | Type | Description |
|--------|------|-------------|
| `target` | `'app' \| 'page'` | What to capture: `'app'` (inner iframe, default) or `'page'` (full inspector) |
| `element` | `Locator` | Specific locator to screenshot instead of the default target |
| `threshold` | `number` | Pixel comparison threshold (0-1) |
| `maxDiffPixelRatio` | `number` | Maximum allowed ratio of differing pixels (0-1) |

All Playwright `toHaveScreenshot` options are passed through.

Configure project-wide visual defaults:

```typescript
import { defineConfig } from 'sunpeak/test/config';
export default defineConfig({
  visual: {
    threshold: 0.2,
    maxDiffPixelRatio: 0.05,
  },
});
```

### Playwright Config

```typescript
// playwright.config.ts
import { defineConfig } from 'sunpeak/test/config';
export default defineConfig();
// Creates per-host projects (chatgpt, claude). Tests run once per host automatically.
```

For non-sunpeak MCP servers, pass a `server` option:

```typescript
import { defineConfig } from 'sunpeak/test/config';
export default defineConfig({
  server: {
    url: 'http://localhost:8000/mcp',
  },
});

// Or with a command:
export default defineConfig({
  server: {
    command: 'python',
    args: ['server.py'],
  },
});
```

### Locator Rules

Resource content renders inside a double-iframe (outer sandbox proxy + inner app iframe). In e2e tests:
- Use `result.app().locator(...)` (from `mcp.callTool()`) for resource content. This handles the double-iframe sandbox architecture.
- Use `mcp.page.locator(...)` only for inspector chrome elements (header, `#root`, sidebar controls).

## Simulations

E2e tests consume simulation fixtures defined in `tests/simulations/*.json`. For sunpeak projects, simulations are part of the app project structure (see the `create-sunpeak-app` skill for the simulation file format). For non-sunpeak servers, `callTool` connects to the live server via the configured `server` option.

## Live Testing (against real ChatGPT)

Live tests validate MCP Apps inside real ChatGPT. They use Playwright to open the user's browser, send messages that trigger tool calls, and assert on the rendered app iframe.

### Live Test Pattern

One spec file per resource. Import `test` and `expect` from `sunpeak/test/live` -- the `live` fixture handles login, MCP refresh, and host-specific message formatting.

```typescript
// tests/live/weather.spec.ts
import { test, expect } from 'sunpeak/test/live';

test('weather tool renders forecast', async ({ live }) => {
  const app = await live.invoke('show me the weather in Austin');
  await expect(app.locator('h1')).toBeVisible();
});
```

Config is a one-liner:
```typescript
// tests/live/playwright.config.ts
import { defineLiveConfig } from 'sunpeak/test/live/config';
export default defineLiveConfig();
// Add hosts: defineLiveConfig({ hosts: ['chatgpt', 'claude'] })
// Generates one Playwright project per host. Tests switch themes internally via live.setColorScheme().
```

### live Fixture API

| Method | Description |
|--------|-------------|
| `invoke(prompt)` | Start new chat, send prompt, return app FrameLocator (one-liner) |
| `startNewChat()` | Start a new conversation (for multi-step flows) |
| `sendMessage(text)` | Send a message with host-appropriate formatting |
| `sendRawMessage(text)` | Send a message without prefix |
| `waitForAppIframe({ timeout })` | Wait for MCP app iframe to render (default 90s) |
| `getAppIframe()` | Get FrameLocator for the app iframe |
| `setColorScheme(scheme, appFrame?)` | Switch the host to `'light'` or `'dark'` theme. Optionally pass an app FrameLocator to wait for it to update. |
| `page` | Raw Playwright `Page` object for advanced assertions |

### Running

```bash
# Requires: tunnel running (ngrok http 8000) + logged into ChatGPT in your browser
pnpm test:live

# Or via validate pipeline
sunpeak validate --live
```

The browser opens visibly -- headless mode is blocked by chatgpt.com's bot detection.

The live test runner imports your browser session, starts `sunpeak dev --prod-resources`, and refreshes the MCP server connection in ChatGPT once in globalSetup before all workers. Tests run in parallel -- each test gets its own chat window.

**If auth fails:** If tests report "Not logged into ChatGPT", delete `.auth/` and re-run `pnpm test:live` -- a browser window will open for you to log in again.

## Evals (Multi-Model Tool Calling)

Evals test whether different LLMs call your tools correctly. They connect to your MCP server, discover tools via MCP protocol, and send prompts to multiple models to check tool calling behavior. Each case runs N times per model to measure reliability.

### Setup

```bash
pnpm add ai @ai-sdk/openai @ai-sdk/anthropic @ai-sdk/google
```

Copy `tests/evals/.env.example` to `tests/evals/.env` and add your API keys. The `.env` file is gitignored and loaded automatically when running evals. For sunpeak projects, the dev server starts automatically.

### Configuration (`tests/evals/eval.config.ts`)

```typescript
import { defineEvalConfig } from 'sunpeak/eval';

// API keys are loaded automatically from tests/evals/.env (gitignored).

export default defineEvalConfig({
  // Server is auto-detected for sunpeak projects.
  // For non-sunpeak projects: server: 'http://localhost:8000/mcp',

  models: ['gpt-4o', 'gpt-4o-mini', 'o4-mini', 'claude-sonnet-4-20250514', 'gemini-2.0-flash'],
  defaults: {
    runs: 10,
    maxSteps: 1,
    temperature: 0,
    timeout: 30_000,
  },
});
```

### Writing Evals (`tests/evals/*.eval.ts`)

```typescript
import { expect } from 'vitest';
import { defineEval } from 'sunpeak/eval';

export default defineEval({
  cases: [
    {
      name: 'food category request',
      prompt: 'Show me photos from my Austin pizza tour',
      expect: {
        tool: 'show-albums',
        args: { search: expect.stringMatching(/pizza|austin/i) },
      },
    },
    {
      name: 'multi-step flow',
      prompt: 'Write a post for X and LinkedIn',
      maxSteps: 3,
      expect: [
        { tool: 'review-post' },
        { tool: 'publish-post' },
      ],
    },
    {
      name: 'custom assertion',
      prompt: 'Show me vacation photos',
      assert: (result) => {
        expect(result.toolCalls).toHaveLength(1);
        expect(result.toolCalls[0].name).toBe('show-albums');
      },
    },
  ],
});
```

Three assertion levels: single tool (`expect: { tool, args }`), ordered sequence (`expect: [...]`), or custom function (`assert: (result) => { ... }`). Args use partial matching -- extra keys in the actual call are allowed.

### Running

```bash
sunpeak test --eval                          # All evals
sunpeak test --eval tests/evals/albums.eval.ts  # Single file
```

Not included in the default `sunpeak test` run (costs money, like `--live`).

## Common Mistakes

1. **Wrong Playwright locator** -- Use `result.app().locator(...)` (from `mcp.callTool()`) for resource content. This handles the double-iframe sandbox architecture. Use `mcp.page.locator(...)` only for inspector chrome elements.
2. **Simulation tool mismatch** -- The `"tool"` field in simulation JSON must match a tool filename in `src/tools/` (e.g. `"tool": "show-weather"` matches `src/tools/show-weather.ts`).
3. **Missing console error filter** -- When testing for console errors, always filter out expected MCP handshake errors (`[IframeResource]`, `mcp`, `PostMessage`, `connect`).

## Export Paths

| Import | Contents |
|--------|----------|
| `sunpeak/test` | MCP-first Playwright fixtures (`test` with `mcp` fixture, `expect` with MCP-native matchers) |
| `sunpeak/test/config` | Playwright config factory (`defineConfig` for e2e tests) |
| `sunpeak/test/live` | Host-agnostic Playwright fixtures for live testing (`test` with `live` fixture, `expect`, `setColorScheme`) |
| `sunpeak/test/live/config` | Live test config factory (`defineLiveConfig` with `hosts` array) |
| `sunpeak/test/live/chatgpt` | ChatGPT-specific Playwright fixtures (`test` with `chatgpt` fixture) |
| `sunpeak/test/live/chatgpt/config` | ChatGPT-specific Playwright config factory |
| `sunpeak/test/inspect/config` | Inspect config factory for external MCP servers (`defineInspectConfig`) |
| `sunpeak/eval` | Eval framework (`defineEval`, `defineEvalConfig`) for multi-model tool calling evals |

## References

- [sunpeak Documentation](https://sunpeak.ai/docs)
- [MCP Apps Documentation](https://sunpeak.ai/docs/mcp-apps/introduction)
- [MCP Apps SDK](https://github.com/modelcontextprotocol/ext-apps)
