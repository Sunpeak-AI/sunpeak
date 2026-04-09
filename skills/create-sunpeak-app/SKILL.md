---
name: create-sunpeak-app
description: Use when working with sunpeak, or when the user asks to "build an MCP App", "build a ChatGPT App", "add a UI to an MCP tool", "create an interactive resource for Claude Connector or ChatGPT", "build a React UI for an MCP server", or needs guidance on MCP App resources, tool-to-UI data flow, simulation files, host context, platform-specific ChatGPT/Claude features, or end-to-end testing of MCP App UIs.
---

# Create Sunpeak App

Sunpeak is a React framework built on `@modelcontextprotocol/ext-apps` for building MCP Apps with interactive UIs that run inside AI chat hosts (ChatGPT, Claude). It provides React hooks, a dev inspector, a CLI (`sunpeak dev` / `sunpeak build` / `sunpeak start`), and a structured project convention.

## Getting Reference Code

Clone the sunpeak repo for working examples:

```bash
git clone --depth 1 https://github.com/Sunpeak-AI/sunpeak /tmp/sunpeak
```

Template app lives at `/tmp/sunpeak/packages/sunpeak/template/`. This is the canonical project structure — read it first.

## Project Structure

```
sunpeak-app/
├── src/
│   ├── resources/
│   │   └── {name}/
│   │       └── {name}.tsx            # Resource component + ResourceConfig export
│   ├── tools/
│   │   └── {name}.ts                 # Tool metadata, Zod schema, handler
│   ├── server.ts                     # Optional server entry (auth, config, icons)
│   └── styles/
│       └── globals.css               # Tailwind imports
├── tests/
│   ├── simulations/
│   │   └── *.json                    # Simulation fixture files (flat directory)
│   ├── e2e/
│   │   └── {name}.spec.ts            # Playwright inspector tests
│   ├── evals/
│   │   ├── eval.config.ts            # Eval config (models, runs, defaults)
│   │   ├── .env                      # API keys (gitignored)
│   │   └── {name}.eval.ts            # Eval specs (one per resource or tool)
│   └── live/
│       ├── playwright.config.ts      # Live test config (long timeouts, single worker)
│       └── {name}.spec.ts            # Live tests against real ChatGPT (one per resource)
├── package.json
└── (vite.config.ts, tsconfig.json, etc. managed by sunpeak CLI)
```

Discovery is convention-based:
- Resources: `src/resources/{name}/{name}.tsx` (name derived from directory)
- Tools: `src/tools/{name}.ts` (name derived from filename)
- Simulations: `tests/simulations/*.json` (flat directory, `"tool"` string references tool filename)

## Resource Component Pattern

Every resource file exports two things:

1. **`resource`** — A `ResourceConfig` object with [MCP resource](https://sunpeak.ai/docs/mcp-apps/mcp/resources) metadata (name is auto-derived from directory)
2. **A named React component** — The UI (`{Name}Resource`)

```tsx
import { useToolData, useHostContext, useDisplayMode, SafeArea } from 'sunpeak';
import type { ResourceConfig } from 'sunpeak';

// MCP resource metadata (name auto-derived from directory: src/resources/weather/)
export const resource: ResourceConfig = {
  title: 'Weather',
  description: 'Show current weather conditions',
  mimeType: 'text/html;profile=mcp-app',
  _meta: {
    ui: {
      csp: {
        resourceDomains: ['https://cdn.example.com'],
      },
    },
  },
};

// Type definitions
interface WeatherInput {
  city: string;
  units?: 'metric' | 'imperial';
}

interface WeatherOutput {
  temperature: number;
  condition: string;
  humidity: number;
}

// React component
export function WeatherResource() {
  // All hooks must be called before any early return
  const { input, output, isLoading } = useToolData<WeatherInput, WeatherOutput>();
  const context = useHostContext();
  const displayMode = useDisplayMode();

  if (isLoading) return <div className="p-4 text-[var(--color-text-secondary)]">Loading...</div>;

  const isFullscreen = displayMode === 'fullscreen';
  const hasTouch = context?.deviceCapabilities?.touch ?? false;

  return (
    <SafeArea className={isFullscreen ? 'flex flex-col h-screen' : undefined}>
      <div className="p-4">
        <h1 className="text-[var(--color-text-primary)] font-semibold">{input?.city}</h1>
        <p className={`${hasTouch ? 'text-base' : 'text-sm'} text-[var(--color-text-secondary)]`}>
          {output?.temperature}° — {output?.condition}
        </p>
      </div>
    </SafeArea>
  );
}
```

**Rules:**
- Always wrap in `<SafeArea>` to respect host insets
- Use MCP standard CSS variables via Tailwind arbitrary values: `text-[var(--color-text-primary)]`, `text-[var(--color-text-secondary)]`, `bg-[var(--color-background-primary)]`, `border-[var(--color-border-tertiary)]`
- `useToolData<TInput, TOutput>()` — provide types for both input and output
- All hooks must be called before any early `return` (React rules of hooks)
- Do NOT mutate `app` directly inside hooks — use `eslint-disable-next-line react-hooks/immutability` for class setters

## Tool Files

Each tool `.ts` file exports metadata, a Zod schema, an optional output schema, and a handler. The `resource` field links a tool to its UI — omit it for data-only tools:

```ts
// src/tools/show-weather.ts
import { z } from 'zod';
import type { AppToolConfig, ToolHandlerExtra } from 'sunpeak/mcp';

// 1. Tool metadata (resource links to src/resources/weather/ — omit for tools without a UI)
export const tool: AppToolConfig = {
  resource: 'weather',
  title: 'Show Weather',
  description: 'Show current weather conditions',
  annotations: { readOnlyHint: true },
  _meta: { ui: { visibility: ['model', 'app'] } },
};

// 2. Zod schema (auto-converted to JSON Schema for MCP)
export const schema = {
  city: z.string().describe('City name'),
  units: z.enum(['metric', 'imperial']).describe('Temperature units'),
};

// 3. Optional output schema (enables structured output validation)
export const outputSchema = {
  temperature: z.number(),
  condition: z.string(),
  humidity: z.number(),
};

// 4. Handler — return structured data for the UI
export default async function (args: { city: string; units?: string }, extra: ToolHandlerExtra) {
  return {
    structuredContent: {
      temperature: 72,
      condition: 'Partly Cloudy',
      humidity: 55,
    },
  };
}
```

### Backend-Only Tools (Confirmation Loop)

A common pattern pairs a UI tool (for review) with a backend-only tool (for execution). The UI tool's `structuredContent` includes a `reviewTool` field. The resource component reads it and calls the backend tool via `useCallServerTool` when the user confirms:

```ts
// src/tools/review.ts — no resource field, shared by all review variants
import { z } from 'zod';
import type { AppToolConfig, ToolHandlerExtra } from 'sunpeak/mcp';

export const tool: AppToolConfig = {
  title: 'Confirm Review',
  description: 'Execute or cancel a reviewed action after user approval',
  annotations: { readOnlyHint: false },
  _meta: { ui: { visibility: ['model', 'app'] } },
};

export const schema = {
  action: z.string().describe('Action identifier (e.g., "place_order", "apply_changes")'),
  confirmed: z.boolean().describe('Whether the user confirmed'),
  decidedAt: z.string().describe('ISO timestamp of decision'),
  payload: z.record(z.unknown()).optional().describe('Domain-specific data'),
};

type Args = z.infer<z.ZodObject<typeof schema>>;

export default async function (args: Args, _extra: ToolHandlerExtra) {
  if (!args.confirmed) {
    return {
      content: [{ type: 'text' as const, text: 'Cancelled.' }],
      structuredContent: { status: 'cancelled', message: 'Cancelled.' },
    };
  }
  return {
    content: [{ type: 'text' as const, text: 'Completed.' }],
    structuredContent: { status: 'success', message: 'Completed.' },
  };
}
```

The UI tool returns `reviewTool` in its response, and the resource calls `useCallServerTool` on accept/reject. The tool returns both `content` (human-readable text for the host model) and `structuredContent` (with `status` and `message` for the UI). The resource reads `structuredContent.status` to determine success/error styling and displays `structuredContent.message`. One `review` tool handles all review variants (purchases, diffs, posts) via the `action` field. The inspector returns mock simulation data for `callServerTool` calls, matching real host behavior. See the template's `review` resource for the full implementation.

## Simulation Files

Simulations are JSON fixtures that power the dev inspector. Place them in `tests/simulations/` as flat JSON files:

```json
{
  "tool": "show-weather",
  "userMessage": "Show me the weather in Austin, TX.",
  "toolInput": {
    "city": "Austin",
    "units": "imperial"
  },
  "toolResult": {
    "structuredContent": {
      "temperature": 72,
      "condition": "Partly Cloudy",
      "humidity": 55
    }
  }
}
```

Key fields:
- `tool` — String referencing a tool filename in `src/tools/` (without `.ts`)
- `userMessage` — Decorative text shown in inspector (no functional purpose)
- `toolInput` — Arguments sent to the tool (shown as input to `useToolData`)
- `toolResult.structuredContent` — The data rendered by `useToolData().output`
- `toolResult.content[]` — Text fallback for non-UI hosts
- `serverTools` — Mock responses for `callServerTool` calls. Keys are tool names. Values are either a single `CallToolResult` (always returned) or an array of `{ when, result }` entries for conditional matching against call arguments.

Example with `serverTools` (for resources that call backend-only tools):
```json
{
  "tool": "review-purchase",
  "toolResult": { "structuredContent": { "..." } },
  "serverTools": {
    "review": [
      { "when": { "confirmed": true }, "result": { "content": [{ "type": "text", "text": "Completed." }], "structuredContent": { "status": "success", "message": "Completed." } } },
      { "when": { "confirmed": false }, "result": { "content": [{ "type": "text", "text": "Cancelled." }], "structuredContent": { "status": "cancelled", "message": "Cancelled." } } }
    ]
  }
}
```

Multiple simulations per tool are supported: `review-diff.json`, `review-post.json` sharing the same resource via the same tool's `resource` field.

## Core Hooks Reference

All hooks are imported from `sunpeak`:

| Hook | Returns | Description |
|------|---------|-------------|
| `useToolData<TIn, TOut>()` | `{ input, inputPartial, output, isLoading, isError, isCancelled }` | Reactive tool data from host |
| `useHostContext()` | `McpUiHostContext \| null` | Host context (theme, locale, capabilities, etc.) |
| `useTheme()` | `'light' \| 'dark' \| undefined` | Current theme |
| `useDisplayMode()` | `'inline' \| 'pip' \| 'fullscreen'` | Current display mode (defaults to `'inline'`) |
| `useLocale()` | `string` | Host locale (e.g. `'en-US'`, defaults to `'en-US'`) |
| `useTimeZone()` | `string` | IANA time zone (falls back to browser time zone) |
| `usePlatform()` | `'web' \| 'desktop' \| 'mobile' \| undefined` | Host-reported platform type |
| `useDeviceCapabilities()` | `{ touch?, hover? }` | Device input capabilities |
| `useUserAgent()` | `string \| undefined` | Host application identifier |
| `useStyles()` | `McpUiHostStyles \| undefined` | Host style configuration (CSS variables, fonts) |
| `useToolInfo()` | `{ id?, tool } \| undefined` | Metadata about the tool call that created this app |
| `useSafeArea()` | `{ top, right, bottom, left }` | Safe area insets (px) |
| `useViewport()` | `{ width, height, maxWidth, maxHeight }` | Container dimensions (px) |
| `useIsMobile()` | `boolean` | True if viewport is mobile-sized |
| `useApp()` | `App \| null` | Raw [MCP App](https://sunpeak.ai/docs/mcp-apps/mcp/overview) instance for direct SDK calls |
| `useCallServerTool()` | `(params) => Promise<result>` | Returns a function to call a server-side tool by name |
| `useSendMessage()` | `(params) => Promise<void>` | Returns a function to send a message to the conversation |
| `useOpenLink()` | `(params) => Promise<void>` | Returns a function to open a URL through the host |
| `useRequestDisplayMode()` | `{ requestDisplayMode, availableModes }` | Request `'inline'`, `'pip'`, or `'fullscreen'`; check `availableModes` first |
| `useDownloadFile()` | `(params) => Promise<result>` | Download files through the host (works cross-platform) |
| `useReadServerResource()` | `(params) => Promise<result>` | Read a resource from the MCP server by URI |
| `useListServerResources()` | `(params?) => Promise<result>` | List available resources on the MCP server |
| `useUpdateModelContext()` | `(params) => Promise<void>` | Push state to the host's model context directly |
| `useSendLog()` | `(params) => Promise<void>` | Send debug log to host |
| `useHostInfo()` | `{ hostVersion, hostCapabilities }` | Host name, version, and supported capabilities |
| `useTeardown(fn)` | `void` | Register a teardown handler |
| `useAppTools(config)` | `void` | Register tools the app provides to the host (bidirectional tool calling) |
| `useRequestTeardown()` | `() => Promise<void>` | Request the host to tear down this app instance |
| `useAppState(initial)` | `[state, setState]` | React state that auto-syncs to host model context via `updateModelContext()` |

### `useRequestDisplayMode` details

```tsx
const { requestDisplayMode, availableModes } = useRequestDisplayMode();

// Always check availability before requesting
if (availableModes?.includes('fullscreen')) {
  await requestDisplayMode('fullscreen');
}
if (availableModes?.includes('pip')) {
  await requestDisplayMode('pip');
}
```

### `useCallServerTool` details

```tsx
const callTool = useCallServerTool();

const result = await callTool({ name: 'get-weather', arguments: { city: 'Austin' } });
// result: { content?: [...], isError?: boolean }
```

### `useSendMessage` details

```tsx
const sendMessage = useSendMessage();

await sendMessage({
  role: 'user',
  content: [{ type: 'text', text: 'Please refresh the data.' }],
});
```

### `useAppState` details

State is preserved in React and automatically sent to the host via `updateModelContext()` after each update, so the LLM can see the current UI state in its context window.

```tsx
const [state, setState] = useAppState<{ decision: 'accepted' | 'rejected' | null }>({
  decision: null,
});
// setState triggers a re-render AND pushes state to the model context
setState({ decision: 'accepted' });
```

### `useToolData` details

```tsx
const {
  input,         // TInput | null — final tool input arguments
  inputPartial,  // TInput | null — partial (streaming) input as it generates
  output,        // TOutput | null — tool result (structuredContent ?? content)
  isLoading,     // boolean — true until first toolResult arrives
  isError,       // boolean — true if tool returned an error
  isCancelled,   // boolean — true if tool was cancelled
  cancelReason,  // string | null
} = useToolData<MyInput, MyOutput>(defaultInput, defaultOutput);
```

Use `inputPartial` for progressive rendering during LLM generation. Use `output` for the final data.

### `useDownloadFile` details

```tsx
const downloadFile = useDownloadFile();

// Download embedded text content
await downloadFile({
  contents: [{
    type: 'resource',
    resource: {
      uri: 'file:///export.json',
      mimeType: 'application/json',
      text: JSON.stringify(data, null, 2),
    },
  }],
});

// Download embedded binary content
await downloadFile({
  contents: [{
    type: 'resource',
    resource: {
      uri: 'file:///image.png',
      mimeType: 'image/png',
      blob: base64EncodedPng,
    },
  }],
});
```

### `useReadServerResource` / `useListServerResources` details

```tsx
const readResource = useReadServerResource();
const listResources = useListServerResources();

// List available resources
const result = await listResources();
for (const resource of result?.resources ?? []) {
  console.log(resource.name, resource.uri);
}

// Read a specific resource by URI
const content = await readResource({ uri: 'videos://bunny-1mb' });
```

### `useAppTools` details

Register tools the app provides to the host for bidirectional tool calling. Requires `tools` capability.

```tsx
import { useAppTools } from 'sunpeak';

function MyResource() {
  useAppTools({
    tools: [{
      name: 'get-selection',
      description: 'Get current user selection',
      inputSchema: { type: 'object', properties: {} },
      handler: async () => ({
        content: [{ type: 'text', text: selectedText }],
      }),
    }],
  });
}
```

## Commands

Testing (works with any MCP server):
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

App framework (for sunpeak projects):
```bash
sunpeak new         # Scaffold a new sunpeak app project
sunpeak dev         # Start dev server (Vite + MCP server, port 3000 web / 8000 MCP)
sunpeak build       # Build resources + compile tools to dist/
sunpeak start       # Start production MCP server (real handlers, auth, Zod validation)
sunpeak upgrade     # Upgrade sunpeak to the latest version
```

The `sunpeak dev` command starts both the Vite dev server and the MCP server together. The inspector runs at `http://localhost:3000`. Connect ChatGPT to `http://localhost:8000/mcp` (or use ngrok for remote testing).

Use `sunpeak build && sunpeak start` to test production behavior locally with real handlers instead of simulation fixtures.

The `sunpeak dev` command supports two orthogonal flags for testing different combinations:
- `--prod-tools` — Route `callServerTool` to real tool handlers instead of simulation mocks
- `--prod-resources` — Serve production-built HTML from `dist/` instead of Vite HMR
- `--prod-tools --prod-resources` — Full smoke test: production bundles with real handlers

### Production Server Options

```bash
sunpeak start                          # Default: port 8000, all interfaces
sunpeak start --port 3000              # Custom port
sunpeak start --host 127.0.0.1         # Bind to localhost only
sunpeak start --json-logs              # Structured JSON logging
PORT=3000 HOST=127.0.0.1 sunpeak start # Via environment variables
```

The production server provides:
- `/health` — Health check endpoint (`{"status":"ok","uptime":N}`) for load balancer probes and monitoring
- `/mcp` — MCP Streamable HTTP endpoint
- Graceful shutdown on SIGTERM/SIGINT (5-second drain)
- Structured JSON logging (`--json-logs`) for log aggregation (Datadog, CloudWatch, etc.)

## Production Build Output

`sunpeak build` generates optimized bundles in `dist/`:

```
dist/
├── weather/
│   ├── weather.html   # Self-contained bundle (JS + CSS inlined)
│   └── weather.json   # ResourceConfig with generated uri for cache-busting
├── tools/
│   ├── show-weather.js  # Compiled tool handler + Zod schema
│   └── ...
├── server.js          # Compiled server entry (if src/server.ts exists)
└── ...
```

`sunpeak start` loads everything from `dist/` and starts a production MCP server with real tool handlers, Zod input validation, and optional auth from `src/server.ts`.

## Host Detection

```tsx
import { isChatGPT, isClaude, detectHost } from 'sunpeak/host';

// In a resource component
function MyResource() {
  const host = detectHost(); // 'chatgpt' | 'claude' | 'unknown'

  if (isChatGPT()) {
    // Safe to use ChatGPT-specific hooks
  }
}
```

## ChatGPT-Specific Hooks

Import from `sunpeak/host/chatgpt`. Always feature-detect before use.

```tsx
import { useUploadFile, useRequestModal, useRequestCheckout } from 'sunpeak/host/chatgpt';
import { isChatGPT } from 'sunpeak/host';

function MyResource() {
  // Only call these when on ChatGPT
  const { upload } = useUploadFile();
  const { open } = useRequestModal();
  const { checkout } = useRequestCheckout();
}
```

| Hook | Description |
|------|-------------|
| `useUploadFile()` | Upload a file to ChatGPT, returns file ID |
| `useGetFileDownloadUrl(fileId)` | **Deprecated** — use `useDownloadFile()` from `sunpeak` instead |
| `useRequestModal(params)` | Open a host-native modal dialog |
| `useRequestCheckout(session)` | Trigger ChatGPT instant checkout |

## SafeArea Component

Always wrap resource content in `<SafeArea>` to respect host insets:

```tsx
import { SafeArea } from 'sunpeak';

export function MyResource() {
  return (
    <SafeArea>
      {/* your content */}
    </SafeArea>
  );
}
```

`SafeArea` applies `padding` equal to `useSafeArea()` insets automatically.

## Styling with MCP Standard Variables

Use MCP standard CSS variables via Tailwind arbitrary values instead of raw colors. These variables adapt automatically to each host's theme (ChatGPT, Claude):

| Tailwind Class | CSS Variable | Usage |
|-------|-------|-------|
| `text-[var(--color-text-primary)]` | `--color-text-primary` | Primary text |
| `text-[var(--color-text-secondary)]` | `--color-text-secondary` | Secondary/muted text |
| `bg-[var(--color-background-primary)]` | `--color-background-primary` | Card/surface background |
| `bg-[var(--color-background-secondary)]` | `--color-background-secondary` | Secondary/nested surface background |
| `bg-[var(--color-background-tertiary)]` | `--color-background-tertiary` | Tertiary background |
| `bg-[var(--color-ring-primary)]` | `--color-ring-primary` | Primary action color (e.g. badge fill) |
| `border-[var(--color-border-tertiary)]` | `--color-border-tertiary` | Subtle border |
| `border-[var(--color-border-primary)]` | `--color-border-primary` | Default border |
| `dark:` variant | — | Dark mode via `[data-theme="dark"]` |

These variables use CSS `light-dark()` so they respond to theme changes automatically. The `dark:` Tailwind variant also works via `[data-theme="dark"]`.

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

## ResourceConfig Fields

```typescript
import type { ResourceConfig } from 'sunpeak';

// name is auto-derived from the directory (src/resources/my-resource/)
export const resource: ResourceConfig = {
  title: 'My Resource',           // Human-readable title
  description: 'What it shows',   // Description for MCP hosts
  mimeType: 'text/html;profile=mcp-app',  // Required for MCP App resources
  _meta: {
    ui: {
      csp: {
        resourceDomains: ['https://cdn.example.com'],    // Image/script CDNs
        connectDomains: ['https://api.example.com'],     // API fetch targets
      },
    },
  },
};
```

## Live Testing (against real ChatGPT)

Live tests validate MCP Apps inside real ChatGPT. They use Playwright to open the user's browser, send messages that trigger tool calls, and assert on the rendered app iframe.

### Live Test Pattern

One spec file per resource. Import `test` and `expect` from `sunpeak/test/live` — the `live` fixture handles login, MCP refresh, and host-specific message formatting.

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

The browser opens visibly — headless mode is blocked by chatgpt.com's bot detection.

The live test runner imports your browser session, starts `sunpeak dev --prod-resources`, and refreshes the MCP server connection in ChatGPT once in globalSetup before all workers. Tests run in parallel — each test gets its own chat window.

**If auth fails:** If tests report "Not logged into ChatGPT", delete `.auth/` and re-run `pnpm test:live` — a browser window will open for you to log in again.

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

Three assertion levels: single tool (`expect: { tool, args }`), ordered sequence (`expect: [...]`), or custom function (`assert: (result) => { ... }`). Args use partial matching — extra keys in the actual call are allowed.

### Running

```bash
sunpeak test --eval                          # All evals
sunpeak test --eval tests/evals/albums.eval.ts  # Single file
```

Not included in the default `sunpeak test` run (costs money, like `--live`).

## Common Mistakes

1. **Hooks before early returns** — All hooks must run unconditionally. Move `useMemo`/`useEffect` above any `if (...) return` blocks.
2. **Missing `<SafeArea>`** — Always wrap content in `<SafeArea>` to respect host safe area insets.
3. **Wrong Playwright locator** — Use `result.app().locator(...)` (from `mcp.callTool()`) for resource content. This handles the double-iframe sandbox architecture. Use `mcp.page.locator(...)` only for inspector chrome elements.
4. **Hardcoded colors** — Use MCP standard CSS variables via Tailwind arbitrary values (`text-[var(--color-text-primary)]`, `bg-[var(--color-background-primary)]`) not raw colors.
5. **Simulation tool mismatch** — The `"tool"` field in simulation JSON must match a tool filename in `src/tools/` (e.g. `"tool": "show-weather"` matches `src/tools/show-weather.ts`).
6. **Mutating hook params** — Use `eslint-disable-next-line react-hooks/immutability` for `app.onteardown = ...` (class setter, not a mutation).
7. **Forgetting text fallback** — Include `toolResult.content[]` in simulations for non-UI hosts.

## Troubleshooting: App Not Rendering in ChatGPT/Claude

If the app doesn't show up after the tool is called, follow these steps:

1. **Check your tunnel** — verify ngrok (or equivalent) is running, pointing to the right port, and using `http` not `https` upstream (`ngrok http 8000`).
2. **Check your dev server** — make sure `sunpeak dev` is running and the MCP server started on the expected port (watch for "port was in use" messages).
3. **Restart `sunpeak dev`** — stops the dev server (`Ctrl+C`) and starts fresh. This clears stale connections.
4. **Refresh or re-add the MCP server** — in the host's settings, click refresh on the MCP server entry, or remove and re-add it with the tunnel URL.
5. **Hard refresh the host page** — `Cmd+Shift+R` / `Ctrl+Shift+R` clears cached MCP connections.
6. **Open a new chat** — both hosts cache iframe content per-conversation. A new chat forces a fresh connection.

Full troubleshooting guide: https://sunpeak.ai/docs/guides/troubleshooting

## Export Paths

| Import | Contents |
|--------|----------|
| `sunpeak` | Hooks, types, SDK re-exports, `SafeArea`, `inspector` + `chatgpt` namespaces |
| `sunpeak/mcp` | Server utilities (`runMCPServer`, `createMcpHandler`, `createProductionMcpServer`), tool types (`AppToolConfig`, `ToolHandlerExtra`), server config (`ServerConfig`) |
| `sunpeak/inspector` | Generic Inspector, host shell system, infrastructure |
| `sunpeak/chatgpt` | ChatGPT host shell + Inspector re-export |
| `sunpeak/claude` | Claude host shell + Inspector re-export |
| `sunpeak/host` | Host detection (`isChatGPT`, `isClaude`, `detectHost`) |
| `sunpeak/host/chatgpt` | ChatGPT-specific hooks (`useUploadFile`, `useRequestModal`, `useRequestCheckout`) |
| `sunpeak/test` | MCP-first Playwright fixtures (`test` with `mcp` fixture, `expect` with MCP-native matchers) |
| `sunpeak/test/config` | Playwright config factory (`defineConfig` for e2e tests) |
| `sunpeak/test/live` | Host-agnostic Playwright fixtures for live testing (`test` with `live` fixture, `expect`, `setColorScheme`) |
| `sunpeak/test/live/config` | Live test config factory (`defineLiveConfig` with `hosts` array) |
| `sunpeak/test/live/chatgpt` | ChatGPT-specific Playwright fixtures (`test` with `chatgpt` fixture) |
| `sunpeak/test/live/chatgpt/config` | ChatGPT-specific Playwright config factory |
| `sunpeak/test/inspect/config` | Inspect config factory for external MCP servers (`defineInspectConfig`) |
| `sunpeak/eval` | Eval framework (`defineEval`, `defineEvalConfig`) for multi-model tool calling evals |
| `sunpeak/style.css` | Main stylesheet |

## References

- [sunpeak Documentation](https://sunpeak.ai/docs)
- [MCP Apps Documentation](https://sunpeak.ai/docs/mcp-apps/introduction)
- [MCP Overview](https://sunpeak.ai/docs/mcp-apps/mcp/overview) · [Tools](https://sunpeak.ai/docs/mcp-apps/mcp/tools) · [Resources](https://sunpeak.ai/docs/mcp-apps/mcp/resources)
- [MCP Apps SDK](https://github.com/modelcontextprotocol/ext-apps)
- [ChatGPT Apps SDK Design Guidelines](https://developers.openai.com/apps-sdk/concepts/design-guidelines)
