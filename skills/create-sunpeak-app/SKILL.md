---
name: create-sunpeak-app
description: Use when working with sunpeak, or when the user asks to "build an MCP App", "build a ChatGPT App", "add a UI to an MCP tool", "create an interactive resource for Claude or ChatGPT", "build a React UI for an MCP server", or needs guidance on MCP App resources, tool-to-UI data flow, simulation files, host context, platform-specific ChatGPT/Claude features, or end-to-end testing of MCP App UIs.
---

# Create Sunpeak App

Sunpeak is a React framework built on `@modelcontextprotocol/ext-apps` for building MCP Apps with interactive UIs that run inside AI chat hosts (ChatGPT, Claude). It provides React hooks, a dev simulator, a CLI (`sunpeak dev` / `sunpeak build`), and a structured project convention.

## Getting Reference Code

Clone the sunpeak repo for working examples:

```bash
git clone --depth 1 https://github.com/Sunpeak-AI/sunpeak /tmp/sunpeak
```

Template app lives at `/tmp/sunpeak/packages/sunpeak/template/`. This is the canonical project structure — read it first.

## Project Structure

```
my-sunpeak-app/
├── src/
│   ├── resources/
│   │   └── {name}/
│   │       └── {name}-resource.tsx   # Resource component + ResourceConfig export
│   └── styles/
│       └── globals.css               # Tailwind imports
├── tests/
│   ├── simulations/
│   │   └── {name}/
│   │       └── {name}-{scenario}-simulation.json  # Simulation fixture files
│   └── e2e/
│       └── {name}.spec.ts            # Playwright tests
├── package.json
└── (vite.config.ts, tsconfig.json, etc. managed by sunpeak CLI)
```

Discovery is convention-based:
- Resources: `src/resources/{name}/{name}-resource.tsx`
- Simulations: `tests/simulations/{name}/{name}-{scenario}-simulation.json`

## Resource Component Pattern

Every resource file exports two things:

1. **`resource`** — A `ResourceConfig` object with MCP metadata
2. **A named React component** — The UI (`{Name}Resource`)

```tsx
import { useToolData, useHostContext, useDisplayMode, SafeArea } from 'sunpeak';
import type { ResourceConfig } from 'sunpeak';

// MCP resource metadata
export const resource: ResourceConfig = {
  name: 'weather',
  title: 'Weather',
  description: 'Show current weather conditions',
  mimeType: 'text/html;profile=mcp-app',
  _meta: {
    ui: {
      domain: 'https://myapp.example.com',
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

  if (isLoading) return <div className="p-4 text-secondary">Loading...</div>;

  const isFullscreen = displayMode === 'fullscreen';
  const hasTouch = context?.deviceCapabilities?.touch ?? false;

  return (
    <SafeArea className={isFullscreen ? 'flex flex-col h-screen' : undefined}>
      <div className="p-4">
        <h1 className="text-primary font-semibold">{input?.city}</h1>
        <p className={`${hasTouch ? 'text-base' : 'text-sm'} text-secondary`}>
          {output?.temperature}° — {output?.condition}
        </p>
      </div>
    </SafeArea>
  );
}
```

**Rules:**
- Always wrap in `<SafeArea>` to respect host insets
- Use Tailwind semantic tokens: `text-primary`, `text-secondary`, `bg-surface`, `border-subtle`
- `useToolData<TInput, TOutput>()` — provide types for both input and output
- All hooks must be called before any early `return` (React rules of hooks)
- Do NOT mutate `app` directly inside hooks — use `eslint-disable-next-line react-hooks/immutability` for class setters

## Simulation Files

Simulations are JSON fixtures that power the dev simulator and MCP server. Place them at:
`tests/simulations/{name}/{name}-{scenario}-simulation.json`

```json
{
  "userMessage": "Show me the weather in Austin, TX.",
  "tool": {
    "name": "show-weather",
    "description": "Show current weather conditions",
    "inputSchema": {
      "type": "object",
      "properties": {
        "city": { "type": "string" },
        "units": { "type": "string", "enum": ["metric", "imperial"] }
      },
      "required": ["city"],
      "additionalProperties": false
    },
    "annotations": { "readOnlyHint": true },
    "_meta": {
      "ui": { "visibility": ["model", "app"] }
    }
  },
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
- `userMessage` — Decorative text shown in simulator (no functional purpose)
- `tool` — Full MCP Tool definition (used in `tools/list`)
- `toolInput` — Arguments sent to the tool (shown as input to `useToolData`)
- `toolResult.structuredContent` — The data rendered by `useToolData().output`
- `toolResult.content[]` — Text fallback for non-UI hosts
- `hostContext` — Optional overrides for `McpUiHostContext` (theme, locale, etc.)

Multiple simulations per resource are supported: `review-diff-simulation.json`, `review-post-simulation.json` sharing the same resource.

## Core Hooks Reference

All hooks are imported from `sunpeak`:

| Hook | Returns | Description |
|------|---------|-------------|
| `useToolData<TIn, TOut>()` | `{ input, inputPartial, output, isLoading, isError, isCancelled }` | Reactive tool data from host |
| `useHostContext()` | `McpUiHostContext \| null` | Host context (theme, locale, capabilities, etc.) |
| `useTheme()` | `'light' \| 'dark' \| undefined` | Current theme |
| `useDisplayMode()` | `'inline' \| 'pip' \| 'fullscreen'` | Current display mode (defaults to `'inline'`) |
| `useSafeArea()` | `{ top, right, bottom, left }` | Safe area insets |
| `useLocale()` | `string \| undefined` | Host locale (e.g. `'en-US'`) |
| `useViewport()` | `{ width, height }` | Viewport dimensions |
| `useIsMobile()` | `boolean` | True if viewport is mobile-sized |
| `useApp()` | `App \| null` | Raw MCP App instance for direct SDK calls |
| `useCallServerTool()` | `(params) => Promise<result>` | Returns a function to call a server-side tool by name |
| `useSendMessage()` | `(params) => Promise<void>` | Returns a function to send a message to the conversation |
| `useOpenLink()` | `(params) => Promise<void>` | Returns a function to open a URL through the host |
| `useRequestDisplayMode()` | `{ requestDisplayMode, availableModes }` | Request `'inline'`, `'pip'`, or `'fullscreen'`; check `availableModes` first |
| `useSendLog()` | `(params) => Promise<void>` | Send debug log to host |
| `useTeardown(fn)` | `void` | Register a teardown handler |
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

## Commands

```bash
pnpm dev      # Start dev server (Vite + MCP server, port 3000 web / 8000 MCP)
pnpm build    # Build all resources to dist/
pnpm test     # Run unit tests (vitest)
pnpm test:e2e # Run Playwright e2e tests
```

The `sunpeak dev` command starts both the Vite dev server and the MCP server together. The simulator runs at `http://localhost:3000`. Connect ChatGPT to `http://localhost:8000/mcp` (or use ngrok for remote testing).

## Production Build Output

`sunpeak build` generates optimized bundles in `dist/`, one folder per resource:

```
dist/
├── weather/
│   ├── weather.html   # Self-contained bundle (JS + CSS inlined)
│   └── weather.json   # ResourceConfig with generated uri for cache-busting
├── review/
│   ├── review.html
│   └── review.json
└── ...
```

The `.json` file contains the `ResourceConfig` extracted from your `.tsx` file and a generated `uri` (e.g. `ui://weather?v=abc123`). Host both files and reference the `.html` in your production MCP server's `registerAppResource` call.

## Platform Detection

```tsx
import { isChatGPT, isClaude, detectPlatform } from 'sunpeak/platform';

// In a resource component
function MyResource() {
  const platform = detectPlatform(); // 'chatgpt' | 'claude' | 'unknown'

  if (isChatGPT()) {
    // Safe to use ChatGPT-specific hooks
  }
}
```

## ChatGPT-Specific Hooks

Import from `sunpeak/platform/chatgpt`. Always feature-detect before use.

```tsx
import { useUploadFile, useRequestModal, useRequestCheckout } from 'sunpeak/platform/chatgpt';
import { isChatGPT } from 'sunpeak/platform';

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
| `useGetFileDownloadUrl(fileId)` | Get a download URL for an uploaded file |
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

## Tailwind Semantic Tokens

Use these tokens instead of raw colors for host theme compatibility:

| Token | Usage |
|-------|-------|
| `text-primary` | Primary text |
| `text-secondary` | Secondary/muted text |
| `bg-surface` | Card/surface background |
| `bg-surface-secondary` | Secondary/nested surface background |
| `bg-background` | Page background |
| `bg-primary` | Primary action color (e.g. badge fill) |
| `text-on-primary` | Text on primary-colored backgrounds |
| `border-subtle` | Subtle border |
| `dark:` variant | Dark mode via `[data-theme="dark"]` |

`useHostContext()` automatically applies `data-theme` to the document, so Tailwind's `dark:` variant works with no extra setup.

## E2E Tests with Playwright

**Critical**: all resource content renders inside an `<iframe>`. Always use `page.frameLocator('iframe')` for resource elements. Only the simulator chrome (`header`, `#root`) uses `page.locator()` directly.

```typescript
import { test, expect } from '@playwright/test';
import { createSimulatorUrl } from 'sunpeak/chatgpt';

test('renders weather card', async ({ page }) => {
  await page.goto(createSimulatorUrl({ simulation: 'weather-show', theme: 'light' }));

  // Access elements INSIDE the resource iframe
  const iframe = page.frameLocator('iframe');
  await expect(iframe.locator('h1')).toHaveText('Austin');
});

test('loads without console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto(createSimulatorUrl({ simulation: 'weather-show', theme: 'dark' }));

  // Wait for content to render
  const iframe = page.frameLocator('iframe');
  await expect(iframe.locator('h1')).toBeVisible();

  // Filter expected MCP handshake noise
  const unexpectedErrors = errors.filter(
    (e) =>
      !e.includes('[IframeResource]') &&
      !e.includes('mcp') &&
      !e.includes('PostMessage') &&
      !e.includes('connect')
  );
  expect(unexpectedErrors).toHaveLength(0);
});
```

`createSimulatorUrl(params)` builds the URL for a simulation. Full params:

| Param | Type | Description |
|-------|------|-------------|
| `simulation` | `string` | Simulation name without `-simulation.json` (e.g. `'carousel-show'`) |
| `theme` | `'light' \| 'dark'` | Color theme (default: `'dark'`) |
| `displayMode` | `'inline' \| 'pip' \| 'fullscreen'` | Display mode (default: `'inline'`) |
| `locale` | `string` | Locale string, e.g. `'en-US'` |
| `deviceType` | `'mobile' \| 'tablet' \| 'desktop'` | Device type preset |
| `touch` | `boolean` | Enable touch capability |
| `hover` | `boolean` | Enable hover capability |
| `safeAreaTop/Bottom/Left/Right` | `number` | Safe area insets in pixels |

## ResourceConfig Fields

```typescript
import type { ResourceConfig } from 'sunpeak';

export const resource: ResourceConfig = {
  name: 'my-resource',            // Unique resource name (kebab-case)
  title: 'My Resource',           // Human-readable title
  description: 'What it shows',   // Description for MCP hosts
  mimeType: 'text/html;profile=mcp-app',  // Required for MCP App resources
  _meta: {
    ui: {
      domain: 'https://myapp.example.com',  // Origin domain
      csp: {
        resourceDomains: ['https://cdn.example.com'],    // Image/script CDNs
        connectDomains: ['https://api.example.com'],     // API fetch targets
      },
    },
  },
};
```

## Common Mistakes

1. **Hooks before early returns** — All hooks must run unconditionally. Move `useMemo`/`useEffect` above any `if (...) return` blocks.
2. **Missing `<SafeArea>`** — Always wrap content in `<SafeArea>` to respect host safe area insets.
3. **Wrong Playwright locator** — Use `page.frameLocator('iframe').locator(...)` for resource content, never `page.locator(...)`.
4. **Hardcoded colors** — Use Tailwind semantic tokens (`text-primary`, `bg-surface`) not raw colors.
5. **Simulation name mismatch** — The simulation key is the filename without `-simulation.json`: `carousel-show-simulation.json` → `carousel-show`.
6. **Mutating hook params** — Use `eslint-disable-next-line react-hooks/immutability` for `app.onteardown = ...` (class setter, not a mutation).
7. **Forgetting text fallback** — Include `toolResult.content[]` in simulations for non-UI hosts.
