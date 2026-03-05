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

### Multi-Host Simulator

The simulator supports multiple host platforms via a **HostShell** abstraction. Each host provides:
- **Conversation chrome** — the visual shell (message bubbles, headers, input areas)
- **Theme** — host-specific CSS variables and theme application
- **Host info & capabilities** — reported to the app via MCP protocol

Switching hosts in the sidebar changes the conversation chrome, theming, and reported host info/capabilities. The sidebar controls, iframe infrastructure, and state management are shared.

### Rendering Flow
1. `Simulator` (host page) → `HostShell.Conversation` → `IframeResource`
2. `IframeResource` creates an `<iframe>` with either:
   - `src` prop (dev mode: HTML page URL with Vite HMR)
   - `scriptSrc` prop → `srcdoc` (prod mode: generated HTML wrapping a JS bundle)
3. `McpAppHost` wraps the SDK's `AppBridge` for host-side communication via PostMessage
4. Inside the iframe, the resource component uses `useApp()` which connects via `PostMessageTransport` to `window.parent`

### E2E Tests
Tests use `page.frameLocator('iframe')` to access resource content inside iframes. Elements on the simulator chrome (header, `#root`) use `page.locator()` directly. Console error tests filter expected MCP handshake errors.

## Package Structure

```
packages/sunpeak/
├── src/
│   ├── index.ts              # Main barrel: SDK re-exports + hooks + types
│   ├── simulator/            # Generic multi-host simulator core
│   │   ├── simulator.tsx     # Simulator component (host picker, sidebar, delegates to shell)
│   │   ├── use-simulator-state.ts  # All simulator state management
│   │   ├── hosts.ts          # HostShell interface + registry
│   │   ├── mcp-app-host.ts   # MCP Apps bridge wrapper (generic, supports streaming partials)
│   │   ├── iframe-resource.tsx  # Iframe rendering + CSP (generic)
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
│   ├── platform/             # Platform detection (detectPlatform, isChatGPT, isClaude)
│   │   └── chatgpt/          # ChatGPT-specific: useUploadFile, useRequestModal, useRequestCheckout
│   ├── lib/                  # Utilities (discovery, cn(), media queries)
│   ├── types/                # Type definitions (Simulation, runtime types)
│   └── cli/                  # CLI commands
├── template/                 # Scaffolded app template (also a workspace package)
│   ├── .sunpeak/             # dev.tsx (simulator bootstrap), resource-loader.tsx (iframe loader)
│   ├── src/resources/        # Example resource components (albums, carousel, map, review)
│   ├── src/tools/            # Tool files with handlers and metadata
│   ├── src/server.ts         # Optional server entry (auth, config)
│   └── tests/                # Unit tests, E2E tests, simulations
└── scripts/
    ├── validate.mjs           # Full validation pipeline
    └── generate-examples.mjs  # Generate examples/ from template resources
```

### Export Map (`sunpeak`)
- `sunpeak` — Hooks, types, SDK re-exports (`App`, `RESOURCE_MIME_TYPE`, `LATEST_PROTOCOL_VERSION`, etc.), `simulator` + `chatgpt` namespaces
- `sunpeak/simulator` — Generic Simulator, host shell system, infrastructure
- `sunpeak/chatgpt` — ChatGPTSimulator (backwards compat alias), ChatGPT shell
- `sunpeak/claude` — ClaudeSimulator alias, Claude shell
- `sunpeak/mcp` — Server utilities (`runMCPServer`, `createMcpHandler`, `createHandler`, `createProductionMcpServer`, `startProductionHttpServer`), tool types (`AppToolConfig`, `ToolHandlerExtra`, `CallToolResult`, `AuthInfo`), production types (`ProductionTool`, `ProductionResource`, `ProductionServerConfig`, `WebHandlerConfig`, `WebAuthFunction`), SDK server helpers (`registerAppTool`, `registerAppResource`, `getUiCapability`, `EXTENSION_ID`)
- `sunpeak/platform` — Platform detection
- `sunpeak/platform/chatgpt` — ChatGPT-specific hooks (file upload, modals, checkout)
- `sunpeak/style.css` — Main stylesheet
- `sunpeak/chatgpt/globals.css` — Simulator globals stylesheet

## Key Types

```typescript
// Tool file export (src/tools/{name}.ts)
interface AppToolConfig extends ToolConfig {
  resource: string;            // Resource name (derived from directory: src/resources/{name}/)
}

// Simulation fixture (tests/simulations/*.json)
interface SimulationJson {
  tool: string;                // References tool filename (e.g., "show-albums")
  userMessage?: string;
  toolInput?: Record<string, unknown>;
  toolResult?: { structuredContent?: unknown };
}

// Internal simulation (dev server runtime)
interface Simulation {
  name: string;
  resourceUrl?: string;        // Dev: HTML page URL (Vite HMR)
  resourceScript?: string;     // Prod: JS bundle URL
  tool: Tool;
  resource: Resource;
  toolInput?: Record<string, unknown>;
  toolResult?: { content?: [...]; structuredContent?: unknown };
}

interface HostShell {
  id: string;                              // 'chatgpt' | 'claude'
  label: string;                           // Display name in sidebar
  Conversation: ComponentType<HostConversationProps>;
  applyTheme: (theme: 'light' | 'dark') => void;
  hostInfo: { name: string; version: string };
  hostCapabilities: McpUiHostCapabilities;
}
```

## Conventions
- pnpm workspace with packages at `packages/*` and `packages/sunpeak/template`
- ESM-first (`"type": "module"`)
- Tailwind CSS with MCP standard variables via arbitrary values (`text-[var(--color-text-primary)]`, `bg-[var(--color-background-primary)]`, `border-[var(--color-border-primary)]`)
- Resources discovered from `src/resources/{name}/{name}.tsx`
- Tools discovered from `src/tools/{name}.ts` (each exports `tool: AppToolConfig`, `schema`, `default` handler)
- Simulations discovered from `tests/simulations/*.json` (flat directory, `"tool"` string field references tool filename)
- Optional server entry at `src/server.ts` (exports `auth()` for request authentication)
