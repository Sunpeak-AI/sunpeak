---
name: sync-host-styles
description: Internal skill for syncing simulator host shell values with real production host runtime behavior. Use when you need to extract real CSS variables, host context, capabilities, or behavioral values from ChatGPT, Claude, or future hosts and apply them to the sunpeak simulator.
---

# Sync Host Styles

This skill extracts runtime values from a real production host (ChatGPT, Claude) using the `host-inspector` resource, then applies those values to the sunpeak simulator's host shell configuration.

## Prerequisites

1. The sunpeak template app must be connected to ChatGPT (added in ChatGPT settings)
2. The MCP dev server must be running with `--prod-resources` (no HMR — HMR triggers browser local network access permission prompts in ChatGPT)
3. The `host-inspector` tool must be registered in the template

## Automated Extraction

The extraction script reuses the **same proven live test infrastructure** (`ChatGPTPage`, `browser-auth`, `global-setup` patterns) that `pnpm test:live` uses. No duplicated selectors or interaction logic.

### Running the extraction

```bash
# From the template directory:
cd packages/sunpeak/template

# 1. Start the MCP dev server with --prod-resources (CRITICAL: no HMR)
#    SUNPEAK_LIVE_TEST=1 suppresses auto-opening the browser
SUNPEAK_LIVE_TEST=1 pnpm dev -- --prod-resources &

# 2. Wait for MCP server to be ready on port 8000
curl -s http://localhost:8000/mcp  # Should return "Bad Request: session ID required"

# 3. Run the extraction script
node tests/live/extract-host-data.mjs
```

**Why `--prod-resources`?** Without it, the dev server uses Vite HMR which tries to open a WebSocket connection from ChatGPT's iframe back to your local dev server. This triggers the browser's "Allow local network access?" permission popup, blocking the resource from rendering.

### Auth flow

The script shares the same auth file as `pnpm test:live` (`.auth/chatgpt.json` in the project root). Auth methods tried in order:

1. **Saved session** (<24h): Reuses existing auth state
2. **Browser cookie import**: Copies cookies from Chrome/Arc/Brave/Edge
3. **Manual login**: Opens a browser for the user to log in (saved for 24h)

### MCP server refresh

Uses `ChatGPTPage.refreshMcpServer()` — the same method live tests use. This:
1. Navigates to `https://chatgpt.com/#settings/Connectors`
2. Finds and clicks the app entry, then clicks Refresh
3. **Waits for the toast confirmation** (success or error)
4. Throws with a debug screenshot if refresh fails

**The MCP dev server must be running on port 8000 before the refresh step**, or the refresh will fail with a toast error.

### Sending the inspector command

Uses `ChatGPTPage.sendMessage()` — the same method live tests use. This handles the `/{appName} prompt` pattern with correct timing:
- Types `/{appName}` with `pressSequentially(delay: 10)`
- Pauses 500ms for ChatGPT to associate the app
- Types a space, pauses 500ms
- Types the rest of the prompt
- Clicks send

### Output

The script writes `packages/sunpeak/template/.context/chatgpt-host-data.json` containing:

```typescript
{
  capturedAt: string,
  dark: { inspector: InspectorData, pageChrome: PageChrome },
  light: { inspector: InspectorData, pageChrome: PageChrome },
  widthSnapshots: Array<{
    browserWidth: number,
    maxWidth: number | null,
    iframeWidth: number | null,
    iframeHeight: number | null,
  }>,
}
```

The `widthSnapshots` array captures how the host sizes the app iframe at different browser widths (375, 425, 640, 768, 1024, 1280, 1440, 1920). This data is critical for calibrating the simulator's conversation column width to match the real host.

## What the Inspector Captures

### InspectorData shape

```typescript
{
  // ── MCP Protocol ──
  hostVersion: { name: string; version: string } | undefined,
  hostCapabilities: McpUiHostCapabilities | undefined,
  theme: 'light' | 'dark' | undefined,
  locale: string | undefined,
  timeZone: string | undefined,
  userAgent: string | undefined,
  platform: 'web' | 'desktop' | 'mobile' | undefined,
  displayMode: 'inline' | 'pip' | 'fullscreen' | undefined,
  availableDisplayModes: string[] | undefined,
  deviceCapabilities: { touch?: boolean; hover?: boolean } | undefined,
  safeArea: { top: number; bottom: number; left: number; right: number },
  viewport: { height?: number; maxHeight?: number; width?: number; maxWidth?: number } | null,
  isMobile: boolean,
  styles: Record<string, string> | undefined,

  // ── Computed CSS ──
  computedCssVariables: Record<string, string>,
  computedRootStyles: { 'font-family': string; 'font-size': string; 'line-height': string; 'color': string; 'background-color': string },

  // ── Window ──
  windowDimensions: { innerWidth: number; innerHeight: number; outerWidth: number; outerHeight: number; devicePixelRatio: number; screenWidth: number; screenHeight: number; scrollX: number; scrollY: number },

  // ── Iframe Environment (NEW) ──
  iframeEnvironment: {
    iframeDepth: number,         // 2 = double-iframe (ChatGPT), 1 = single iframe
    isIframe: boolean,
    sandboxProbes: Record<string, boolean>,  // what sandbox permissions are active
    referrer: string,
    origin: string,              // e.g. "https://connector_xxx.web-sandbox.oaiusercontent.com"
    protocol: string,
    parentOrigin: string,
  },

  // ── Media Queries (NEW) ──
  mediaQueries: Record<string, string>,  // prefers-color-scheme, prefers-reduced-motion, hover, pointer, etc.

  // ── Navigator (NEW) ──
  navigatorInfo: {
    language: string,
    languages: string[],
    cookieEnabled: boolean,
    onLine: boolean,
    hardwareConcurrency: number,
    maxTouchPoints: number,
    userAgent: string,           // browser UA string (distinct from host-reported userAgent)
  },

  // ── Feature Detection (NEW) ──
  featureDetection: Record<string, boolean | string>,  // window.openai, CSS @supports, API availability

  // ── Scroll Container (NEW) ──
  scrollInfo: Record<string, unknown>,  // overflow settings, scrollHeight vs clientHeight

  // ── Performance (NEW) ──
  performanceTiming: Record<string, unknown>,  // domContentLoaded, loadEvent, capturedAt
}
```

### PageChrome shape

```typescript
{
  sidebarBg: string | null,
  conversationBg: string | null,
  userBubbleBg: string | null,
  inputBg: string | null,
  bodyBg: string | null,
}
```

## Applying Values to the Simulator

### Host shell architecture

Each host shell (ChatGPT, Claude) is registered via `registerHostShell()` with:

- **`hostCapabilities`** — MCP protocol capabilities
- **`userAgent`** — String sent to app via `hostContext.userAgent` (e.g., "chatgpt", "claude")
- **`styleVariables`** — CSS variables sent to the app iframe
- **`pageStyles`** — CSS custom properties for the simulator page chrome

The **`containerDimensions.maxWidth`** is automatically measured from the content container via ResizeObserver. The conversation component's CSS max-width determines the actual constraint; the ResizeObserver reports it to the app, matching real host behavior.

### Files to update

**`packages/sunpeak/src/chatgpt/chatgpt-host.ts`** (or `claude/claude-host.ts`):

1. **`CHATGPT_HOST_CAPABILITIES`** — Update to match `data.hostCapabilities`
2. **`userAgent`** — Verify matches extracted `data.userAgent`
3. **`CHATGPT_STYLE_VARIABLES`** — Only override values that differ from `DEFAULT_STYLE_VARIABLES`. As of 2026-03-18, ChatGPT uses the exact SDK defaults.
4. **`pageStyles`** — Update sidebar, conversation, user bubble, and input colors from `pageChrome` data

**`packages/sunpeak/src/chatgpt/chatgpt-conversation.tsx`** (or `claude/claude-conversation.tsx`):

5. **Conversation content max-width** — Compare `widthSnapshots` data against the current `max-w-[48rem]` (768px). If the host uses a different max-width, update the CSS class. The ResizeObserver will automatically report the new width.

**`packages/sunpeak/src/lib/default-style-variables.ts`**:

Only update if the extracted values reveal that the SDK defaults themselves have changed.

### Reconstructing light-dark() values

The extraction captures both themes. Combine them:

```typescript
function toLightDark(lightValue: string, darkValue: string): string {
  if (lightValue === darkValue) return lightValue;
  return `light-dark(${lightValue}, ${darkValue})`;
}
```

### Comparison approach

Compare the extracted `computedCssVariables` against `DEFAULT_STYLE_VARIABLES`:
- If all values match: `CHATGPT_STYLE_VARIABLES = { ...DEFAULT_STYLE_VARIABLES }`
- If some differ: Only override the differing keys

## Values That Are Resource-Influenced (Not Host-Fixed)

| Value | Host-fixed? | Notes |
|-------|------------|-------|
| `windowDimensions.innerHeight` | No | Depends on content height in inline mode |
| `windowDimensions.innerWidth` | Partially | ChatGPT constrains max width (640px observed) |
| `viewport.height` | No | Matches innerHeight in inline mode |
| `viewport.maxWidth` | Host | 640px observed on desktop |
| `displayMode` | Host | Set by host, changed via requestDisplayMode |
| `safeArea` | Host | Mobile-only, all zeros on desktop |
| `deviceCapabilities` | Host | Reflects actual device |
| All `--color-*` variables | Host | Set by host via SDK styles |
| `computedRootStyles.font-size` | Mixed | Base is host-set, CSS can override |

## Known ChatGPT Behaviors (as of 2026-03-19)

### MCP Protocol
- **hostVersion**: `{ name: "chatgpt", version: "0.0.1" }`
- **userAgent**: `"chatgpt"` — sent via hostContext.userAgent
- **hostCapabilities**: No `downloadFile`, sandbox has `microphone` permission, `updateModelContext` and `message` are `{}` (no `text` sub-key)
- **Style variables**: Exactly match SDK defaults — no custom overrides
- **Available display modes**: `["inline", "fullscreen", "pip"]`

### Page Chrome
- Sidebar and conversation backgrounds are transparent (body provides `#ffffff`/`#212121`)
- User bubble: `rgba(233,233,233,0.5)` light / `rgba(50,50,50,0.85)` dark

### Responsive maxWidth
| Browser Width | maxWidth | Notes |
|---|---|---|
| 375px | 375 | Full width (mobile, no sidebar) |
| 425px | 425 | Full width (mobile, no sidebar) |
| 640px | 592 | Full width minus padding |
| 768px | 476 | Sidebar appeared (~292px sidebar) |
| 1024px | 640 | Content capped at 40rem (640px) |
| 1280px | 640 | Content capped at 40rem (640px) |
| 1440px | 768 | Wider breakpoint: 48rem (768px) |
| 1920px | 768 | Capped at 48rem (768px) |

**Conversation max-width CSS**: `max-w-[40rem]` (640px) by default, `max-w-[48rem]` (768px) at 1440px+ viewport

### Display Mode Behavior
ChatGPT reports different `containerDimensions` (exposed as `viewport` to apps) per display mode:

| Mode | containerDimensions shape | Example |
|------|--------------------------|---------|
| inline | `{ height, maxWidth }` | `{ height: 3220, maxWidth: 640 }` |
| fullscreen | `{ height, width }` | `{ height: 800, width: 1280 }` |
| pip | `{ height, maxWidth }` | `{ height: 362, maxWidth: 768 }` |

Key differences:
- **Fullscreen** sends `width` (not `maxWidth`) — the app gets the full viewport
- **PiP** constrains height to ~362px
- **Inline** height is the content height (not the viewport)

### Iframe Environment
- **Iframe depth**: 2 (double-iframe: outer sandbox + inner root)
- **Origin**: `https://connector_{hash}.web-sandbox.oaiusercontent.com` (separate sandbox origin)
- **Sandbox**: `allow-scripts`, `allow-same-origin` (parent accessible), NO `allow-top-navigation`
- **Referrer**: empty
- **`window.openai`**: true (ChatGPT runtime present)
- **`SharedArrayBuffer`**: false (not available in sandbox)

### Media Queries
- `prefers-color-scheme` correctly matches the host theme
- `hover: hover` and `pointer: fine` on desktop
- `prefers-reduced-motion: reduce` is false

### Performance
- domContentLoaded: ~46ms
- App connected: ~93ms after page load

## Known Claude Behaviors (TODO — needs extraction)

- **userAgent**: Expected `"claude"` — needs verification via extraction
- Run the extraction against claude.ai using the same approach

## After Updating

```bash
pnpm --filter sunpeak typecheck
pnpm --filter sunpeak lint
pnpm --filter sunpeak test -- --run
pnpm --filter sunpeak build
```

Then visually compare in the simulator at http://localhost:3001/ alongside a real ChatGPT session.
