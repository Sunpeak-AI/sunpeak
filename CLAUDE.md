# Sunpeak

Sunpeak is a framework for building MCP Apps with interactive UIs that run inside AI chat hosts (ChatGPT, Claude). Built on top of the MCP Apps SDK (`@modelcontextprotocol/ext-apps`).

## Quick Reference

```bash
pnpm --filter sunpeak test -- --run    # Unit tests (vitest, 118 tests)
pnpm --filter sunpeak lint             # ESLint
pnpm --filter sunpeak typecheck        # tsc --noEmit
pnpm --filter sunpeak build            # Vite build
pnpm --filter sunpeak validate         # Full validation (lint + build + test + examples)
pnpm --filter sunpeak generate-examples  # Regenerate examples/ from template
```

## Architecture

**All resource content renders inside iframes** — never directly in the host page. This matches how ChatGPT hosts apps and enables direct re-export of SDK hooks.

### Rendering Flow
1. `ChatGPTSimulator` (host page) → `Conversation` → `IframeResource`
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
│   ├── chatgpt/              # Simulator components (ChatGPTSimulator, IframeResource, McpAppHost)
│   ├── hooks/                # React hooks (useApp, useHostContext, useToolData, etc.)
│   ├── mcp/                  # MCP server (runMCPServer, resource registration)
│   ├── platform/             # Platform detection (detectPlatform, isChatGPT, isClaude)
│   │   └── chatgpt/          # ChatGPT-specific: useUploadFile, useRequestModal, useRequestCheckout
│   ├── lib/                  # Utilities (discovery, cn(), media queries)
│   ├── types/                # Type definitions (Simulation, runtime types)
│   └── cli/                  # CLI commands
├── template/                 # Scaffolded app template (also a workspace package)
│   ├── .sunpeak/             # dev.tsx (simulator bootstrap), resource-loader.tsx (iframe loader)
│   ├── src/resources/        # Example resource components (albums, carousel, map, review)
│   └── tests/e2e/            # Playwright tests
└── scripts/
    ├── validate.mjs           # Full validation pipeline
    └── generate-examples.mjs  # Generate examples/ from template resources
```

### Export Map (`sunpeak`)
- `sunpeak` — Hooks, types, SDK re-exports
- `sunpeak/chatgpt` — Simulator, IframeResource, McpAppHost, simulation utilities
- `sunpeak/mcp` — Server utilities
- `sunpeak/platform` — Platform detection
- `sunpeak/platform/chatgpt` — ChatGPT-specific hooks (file upload, modals, checkout)
- `sunpeak/style.css` — Main stylesheet
- `sunpeak/chatgpt/globals.css` — ChatGPT theme variables

## Key Types

```typescript
interface Simulation {
  name: string;
  resourceUrl?: string;      // Dev: HTML page URL (Vite HMR)
  resourceScript?: string;   // Prod: JS bundle URL
  tool: Tool;
  resource: Resource;
  toolInput?: Record<string, unknown>;
  toolResult?: { content?: [...]; structuredContent?: unknown };
}
```

## Conventions
- pnpm workspace with packages at `packages/*` and `packages/sunpeak/template`
- ESM-first (`"type": "module"`)
- Tailwind CSS with semantic tokens (`text-primary`, `bg-surface`, `border-subtle`)
- Simulation files discovered by convention: `*-simulation.json` or `simulations/*.json`
- Resources discovered by convention from `src/resources/` directory
