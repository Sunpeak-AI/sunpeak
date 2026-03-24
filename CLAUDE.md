# sunpeak

Note that "sunpeak", except where required in URLs or code, is always lowercase.

sunpeak is a framework for building MCP Apps with interactive UIs that run inside AI chat hosts (ChatGPT, Claude, and future major hosts). Built on top of the MCP Apps SDK (`@modelcontextprotocol/ext-apps`).

The value proposition of the sunpeak framework is to help developers and their agents:

1. Test MCP Apps locally and automatically (in CI/CD) using a replica of the ChatGPT and Claude runtimes.
   1. Save time manually testing all possible host, server, app, ui, and backend states.
   2. Protect developers from 4-click manual refreshes on every code change in each host.
   3. Cancel all the $20 per person per host per month testing accounts.
   4. Avoid burning host credits on every test and code change.
2. Build multi-platform MCP Apps in a structured way that's easy to understand and get started.
3. Test their MCPs in ChatGPT with HMR and Claude with automatic rebuilds and refresh notifications.

## Quick Reference

```bash
pnpm --filter sunpeak test -- --run    # Unit tests (vitest)
pnpm --filter sunpeak lint             # ESLint
pnpm --filter sunpeak typecheck        # tsc --noEmit
pnpm --filter sunpeak build            # Vite build
pnpm --filter sunpeak validate         # Full validation (lint + build + test + examples)
pnpm --filter sunpeak generate-examples  # Regenerate examples/ from template
```

## Architecture

**All resource content renders inside iframes** — never directly in the host page. This matches how AI chat hosts (ChatGPT, Claude) display apps and enables direct re-export of SDK hooks.

### Multi-Host Inspector

The inspector supports multiple host platforms via a **HostShell** abstraction. Each host provides:
- **Conversation chrome** — the visual shell (message bubbles, headers, input areas)
- **Theme** — host-specific CSS variables and theme application
- **Host info & capabilities** — reported to the app via MCP protocol

Switching hosts in the sidebar changes the conversation chrome, theming, and reported host info/capabilities. The sidebar controls, iframe infrastructure, and state management are shared.

### Rendering Flow (Double-Iframe Sandbox Architecture)
1. `Inspector` (host page) → `HostShell.Conversation` → `IframeResource`
2. `IframeResource` creates an outer `<iframe>` containing a **sandbox proxy** that relays PostMessage between the host and an inner iframe holding the actual app. This two-level architecture matches how production hosts (ChatGPT, Claude) isolate app iframes on a separate origin (e.g., `web-sandbox.oaiusercontent.com`).
   - **Outer iframe**: Loads the sandbox proxy from a separate-origin server (port 24680) or via `srcdoc` (fallback for unit tests).
   - **Inner iframe**: Created by the proxy, loads the app HTML via `src` (dev: Vite HMR URL) or `document.write()` (prod: generated HTML).
3. `McpAppHost` wraps the SDK's `AppBridge` for host-side communication. Messages flow: host ↔ outer iframe (proxy) ↔ inner iframe (app), all via PostMessage relay.
4. Inside the inner iframe, the resource component uses `useApp()` which connects via `PostMessageTransport` to `window.parent` (the proxy), which relays to the host.

### E2E Tests
Tests use `page.frameLocator('iframe').frameLocator('iframe')` to access resource content inside the double-iframe. Elements on the inspector chrome (header, `#root`) use `page.locator()` directly. Console error tests filter expected MCP handshake errors.

### Live Tests (`pnpm test:live`)
Automated tests against real ChatGPT using Playwright. Uses the same `ChatGPTPage` class for selectors, message sending, and iframe handling. Auth flow: saved session → manual login in the opened browser window. Sessions typically last only a few hours because Cloudflare's HttpOnly `cf_clearance` cookie cannot be persisted by `storageState()`. The `global-setup.mjs` handles auth + MCP server refresh in the same browser session (refresh must happen before the browser closes while `cf_clearance` is still valid).

## Package Structure

```
packages/sunpeak/
├── src/
│   ├── index.ts              # Main barrel: SDK re-exports + hooks + types
│   ├── inspector/            # Generic multi-host inspector core
│   │   ├── inspector.tsx     # Inspector component (host picker, sidebar, delegates to shell)
│   │   ├── use-inspector-state.ts  # All inspector state management
│   │   ├── hosts.ts          # HostShell interface + registry
│   │   ├── mcp-app-host.ts   # MCP Apps bridge wrapper (generic, supports streaming partials)
│   │   ├── iframe-resource.tsx  # Iframe rendering + double-iframe sandbox proxy
│   │   ├── sandbox-proxy.ts    # Sandbox proxy HTML generation (srcdoc fallback)
│   │   ├── simple-sidebar.tsx   # Dev control panel
│   │   └── theme-provider.tsx   # Pluggable theme provider
│   ├── chatgpt/              # ChatGPT host shell
│   │   ├── chatgpt-conversation.tsx  # ChatGPT conversation chrome
│   │   └── chatgpt-host.ts   # Host registration (theme, capabilities)
│   ├── claude/               # Claude host shell
│   │   ├── claude-conversation.tsx   # Claude conversation chrome
│   │   └── claude-host.ts    # Host registration (theme, capabilities)
│   ├── hooks/                # React hooks (useApp, useHostContext, useToolData, useAppState, useUpdateModelContext, useAppTools, etc.)
│   ├── mcp/                  # MCP server (runMCPServer, production-server, resource registration)
│   ├── host/                 # Host detection (detectHost, isChatGPT, isClaude)
│   │   └── chatgpt/          # ChatGPT-specific: useUploadFile, useRequestModal, useRequestCheckout
│   ├── lib/                  # Utilities (discovery, cn(), media queries)
│   ├── types/                # Type definitions (Simulation, runtime types)
│   └── cli/                  # CLI commands
├── template/                 # Scaffolded app template (also a workspace package)
│   ├── src/resources/        # Example resource components (albums, carousel, map, review)
│   ├── src/tools/            # Tool files with handlers and metadata
│   ├── src/server.ts         # Optional server entry (auth, config)
│   └── tests/                # Unit tests, E2E tests, simulations, live tests
└── scripts/
    ├── validate.mjs           # Full validation pipeline
    └── generate-examples.mjs  # Generate examples/ from template resources
```

### Export Map (`sunpeak`)
- `sunpeak` — Hooks, types, SDK re-exports (`App`, `RESOURCE_MIME_TYPE`, `LATEST_PROTOCOL_VERSION`, etc.), `inspector` + `chatgpt` namespaces
- `sunpeak/inspector` — Generic Inspector, host shell system, infrastructure
- `sunpeak/chatgpt` — ChatGPT host shell registration + Inspector re-export
- `sunpeak/claude` — Claude host shell registration + Inspector re-export
- `sunpeak/mcp` — Server utilities (`runMCPServer`, `createMcpHandler`, `createHandler`, `createProductionMcpServer`, `startProductionHttpServer`), tool types (`AppToolConfig`, `ToolHandlerExtra`, `CallToolResult`, `AuthInfo`), server config (`ServerConfig`), production types (`ProductionTool`, `ProductionResource`, `ProductionServerConfig`, `WebHandlerConfig`, `WebAuthFunction`), SDK server helpers (`registerAppTool`, `registerAppResource`, `getUiCapability`, `EXTENSION_ID`)
- `sunpeak/host` — Host detection
- `sunpeak/host/chatgpt` — ChatGPT-specific hooks (file upload, modals, checkout)
- `sunpeak/test` — Host-agnostic Playwright fixtures for live testing (`test` with `live` fixture, `expect`, `setColorScheme`)
- `sunpeak/test/config` — Playwright config factory (`defineLiveConfig` with `hosts` array)
- `sunpeak/test/chatgpt` — ChatGPT-specific Playwright fixtures (`test` with `chatgpt` fixture)
- `sunpeak/test/chatgpt/config` — ChatGPT-specific Playwright config factory
- `sunpeak/style.css` — Main stylesheet

## Key Types

```typescript
// Tool file export (src/tools/{name}.ts)
interface AppToolConfig extends ToolConfig {
  resource?: string;           // Resource name (derived from directory: src/resources/{name}/). Omit for tools without a UI.
}

// Simulation fixture (tests/simulations/*.json)
interface SimulationJson {
  tool: string;                // References tool filename (e.g., "show-albums")
  userMessage?: string;
  toolInput?: Record<string, unknown>;
  toolResult?: { structuredContent?: unknown };
  serverTools?: Record<string, ServerToolMock>;  // Mock responses for callServerTool calls
}

// ServerToolMock: simple (single result) or conditional (when/result array)
type ServerToolMock =
  | CallToolResult
  | Array<{ when: Record<string, unknown>; result: CallToolResult }>;

// Internal simulation (dev server runtime)
interface Simulation {
  name: string;
  resourceUrl?: string;        // Dev: HTML page URL (Vite HMR)
  resourceScript?: string;     // Prod: JS bundle URL
  tool: Tool;
  resource?: Resource;                 // Undefined for tools without a UI
  toolInput?: Record<string, unknown>;
  toolResult?: { content?: [...]; structuredContent?: unknown };
  serverTools?: Record<string, ServerToolMock>;  // Mock responses for callServerTool
}

interface HostShell {
  id: string;                              // 'chatgpt' | 'claude'
  label: string;                           // Display name in sidebar
  Conversation: ComponentType<HostConversationProps>;
  applyTheme: (theme: 'light' | 'dark') => void;
  hostInfo: { name: string; version: string };
  hostCapabilities: McpUiHostCapabilities;
  userAgent?: string;                      // e.g. 'chatgpt', 'claude'
}
```

## Dev Server (`bin/commands/dev.mjs`)

`sunpeak dev` starts the local MCP server (with Vite HMR for resources) and then launches the inspector pointed at it. This means `sunpeak dev` and `sunpeak inspect` share the same inspector UI codepath — the inspector is the single entry point for all inspector use cases.

Architecture:
1. **MCP server** — Started via `runMCPServer()` with `viteMode: true`. Serves tools, resources (with Vite HMR scripts in `readResource` HTML), and simulation data via a custom `sunpeak/simulations` MCP method.
2. **Inspector** — `inspectServer()` from `inspect.mjs` connects to the MCP server URL, discovers tools/resources via MCP protocol, and serves the inspector UI with HMR.
3. **sandboxServer** — A minimal HTTP server on a separate port (default 24680) for cross-origin iframe isolation.

Port management: The MCP server prefers port 8000 (users typically have an ngrok tunnel on this port). The inspector's Vite dev server uses port 24679 for its HMR WebSocket. The sandboxServer uses port 24680 (configurable via `SUNPEAK_SANDBOX_PORT`). The main dev server listens on the user-facing port (default 3000). All ports use `getPort()` to find free alternatives if the preferred port is taken.

### `--prod-tools` and `--prod-resources` flags

Two orthogonal flags that toggle real tool handlers and production resource bundles independently:

| Flags | UI | Tools | Use case |
|-------|-----|-------|----------|
| *(none)* | HMR | Mocked | Day-to-day dev |
| `--prod-tools` | HMR | Real handlers | Integration testing |
| `--prod-resources` | Built | Mocked | CI/E2E, catch build regressions |
| `--prod-tools --prod-resources` | Built | Real handlers | Final smoke test |

**Implementation**: Tool calls flow through MCP protocol to the local server (no Vite middleware). `--prod-tools` sets the initial state of the Prod Tools sidebar checkbox. `--prod-resources` runs `sunpeak build` before starting and sets the initial Prod Resources checkbox state. Both are runtime-toggleable in the sidebar. The `Inspector` component accepts `mcpServerUrl`, `defaultProdResources`, `hideInspectorModes`, `demoMode`, and `sandboxUrl` props.

## Documentation (`docs/`)

Docs are built with [Mintlify](https://mintlify.com). Structure:

- **`docs/docs.json`** — Navigation config. Three tabs: Documentation, API Reference, MCP Apps.
- **`docs/api-reference/hooks/`** — One `.mdx` file per sunpeak hook. Badge: `<Badge color="yellow">sunpeak API</Badge>`.
- **`docs/mcp-apps/`** — MCP Apps SDK documentation (protocol-level, not sunpeak-specific). Badge: `<Badge color="green">MCP Apps SDK</Badge>`.
- **`docs/mcp-apps/types/protocol-reference.mdx`** — Complete protocol type/schema reference.

When adding new hooks or features, you must: create the hook doc page, add it to `docs.json` navigation (alphabetical within its group), and update cross-references (e.g., the `<Tip>` in `mcp-apps/app/requests.mdx` that lists convenience hooks).

**Path consistency**: File paths, `docs.json` group names, and resulting URL paths must stay consistent. When creating or moving doc pages, the file's directory should match the nav group it belongs to (e.g., a page in the "Server" group lives under `mcp-apps/server/`). If a file move changes a URL, add a Mintlify redirect in `docs.json` `"redirects"` to preserve SEO and update all internal links to the new path.

### Places to Update When User-Facing Functionality Changes

When sunpeak package APIs change (new hooks, new features, deprecations, etc.), these locations may need updating:

1. **`docs/`** — Mintlify docs pages (hook docs, MCP Apps SDK docs, cross-references)
2. **READMEs** — `README.md` files throughout the monorepo (`packages/sunpeak/README.md`, root `README.md`, template `README.md`)
3. **`skills/create-sunpeak-app/SKILL.md`** — Agent skill reference with hook tables, code examples, and usage patterns
4. **Marketing website** — Separate repository (`../sunpeak-website/` or similar) with feature descriptions and code samples

## Upgrading Dependencies

### General Process
1. Update `packages/sunpeak/package.json` and `packages/sunpeak/template/package.json`
2. Run `pnpm install` from monorepo root
3. Verify: `pnpm --filter sunpeak typecheck && pnpm --filter sunpeak lint && pnpm --filter sunpeak test -- --run && pnpm --filter sunpeak build`
4. Regenerate examples: `pnpm --filter sunpeak generate-examples`

### Upgrading `@modelcontextprotocol/ext-apps` (MCP Apps SDK)

This is the upstream SDK that sunpeak wraps. Upgrades often introduce new `App` methods, types, schemas, and capabilities that sunpeak must surface. Follow this checklist:

1. **Find the exact diff** — Check the SDK's changelog or diff the installed package (`node_modules/@modelcontextprotocol/ext-apps/dist/`) to identify new exports: methods on `App`, types, Zod schemas, method constants, and host capabilities.
2. **New `App` methods → new hooks** — For each new method on the `App` class (e.g., `app.downloadFile()`, `app.readServerResource()`):
   - Create a hook in `src/hooks/` following the `useCallServerTool`/`useOpenLink` pattern: `useCallback` + `useApp()` null check + `console.warn` fallback.
   - Export from `src/hooks/index.ts` (alphabetical within the "Action hooks" section).
   - Create a doc page in `docs/api-reference/hooks/` and add to `docs.json`.
3. **New types/schemas/constants → re-exports** — Add to `src/index.ts` in the appropriate section (method constants, Zod schemas, or protocol types). Update `docs/mcp-apps/types/protocol-reference.mdx`.
4. **New host capabilities** — Add to `DEFAULT_HOST_CAPABILITIES` in `src/inspector/mcp-app-host.ts` and add the corresponding `bridge.on*` handler.
5. **Update docs version note** — Bump the SDK version in `docs/mcp-apps/introduction.mdx` and `docs/mcp-apps/types/protocol-reference.mdx`.
6. **Check for deprecations** — If new generic APIs supersede platform-specific hooks, remove the old hook and its docs.
7. **Update `requests.mdx`** — Add sections for new `App` methods in `docs/mcp-apps/app/requests.mdx` and update the `<Note>` listing convenience hooks.

### SDK Export Structure

The SDK's main entry (`app.d.ts`) uses `export * from "./types"` to re-export all types, schemas, and constants. To discover available exports, check:
- `node_modules/@modelcontextprotocol/ext-apps/dist/types.d.ts` — All type definitions
- `node_modules/@modelcontextprotocol/ext-apps/dist/app.d.ts` — `App` class methods

## Conventions
- pnpm workspace with packages at `packages/*` and `packages/sunpeak/template`
- ESM-first (`"type": "module"`)
- Tailwind CSS with MCP standard variables via arbitrary values (`text-[var(--color-text-primary)]`, `bg-[var(--color-background-primary)]`, `border-[var(--color-border-primary)]`)
- Resources discovered from `src/resources/{name}/{name}.tsx`
- Tools discovered from `src/tools/{name}.ts` (each exports `tool: AppToolConfig`, `schema`, optional `outputSchema`, `default` handler)
- Simulations discovered from `tests/simulations/*.json` (flat directory, `"tool"` string field references tool filename)
- Optional server entry at `src/server.ts` (exports `server: ServerConfig` for identity/icons, `auth()` for request authentication)
- Hook file naming: `use-{kebab-name}.ts` → export `use{PascalName}` (e.g., `use-download-file.ts` → `useDownloadFile`)
- SDK re-exports in `src/index.ts` are organized into four sections: core classes/functions, method constants, Zod schemas, protocol types
