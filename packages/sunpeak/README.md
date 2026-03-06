<div align="center">
  <a href="https://sunpeak.ai">
    <picture>
      <img alt="Sunpeak logo" src="https://cdn.sunpeak.ai/sunpeak-github.png">
    </picture>
  </a>
</div>

# sunpeak

[![npm version](https://img.shields.io/npm/v/sunpeak.svg?style=flat&color=FFB800&labelColor=000035)](https://www.npmjs.com/package/sunpeak)
[![npm downloads](https://img.shields.io/npm/dm/sunpeak.svg?style=flat&color=FFB800&labelColor=000035)](https://www.npmjs.com/package/sunpeak)
[![stars](https://img.shields.io/github/stars/Sunpeak-AI/sunpeak?style=flat&color=FFB800&labelColor=000035)](https://github.com/Sunpeak-AI/sunpeak)
[![CI](https://img.shields.io/github/actions/workflow/status/Sunpeak-AI/sunpeak/ci.yml?branch=main&style=flat&label=ci&color=FFB800&labelColor=000035)](https://github.com/Sunpeak-AI/sunpeak/actions)
[![License](https://img.shields.io/npm/l/sunpeak.svg?style=flat&color=FFB800&labelColor=000035)](https://github.com/Sunpeak-AI/sunpeak/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?style=flat&logo=typescript&label=ts&color=FFB800&logoColor=white&labelColor=000035)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=flat&logo=react&label=react&color=FFB800&logoColor=white&labelColor=000035)](https://reactjs.org/)

Local-first MCP Apps framework.

Quickstart, build, test, and ship your Claude or ChatGPT App!

[Demo (Hosted)](https://sunpeak.ai/simulator) ~
[Demo (Video)](https://cdn.sunpeak.ai/sunpeak-demo-prod.mp4) ~
[Discord](https://discord.gg/FB2QNXqRnw) ~
[Documentation](https://sunpeak.ai/docs) ~
[GitHub](https://github.com/Sunpeak-AI/sunpeak)

<div align="center">
  <a href="https://sunpeak.ai/docs/library/simulator">
    <picture>
      <img alt="Simulator" src="https://cdn.sunpeak.ai/chatgpt-simulator.png">
    </picture>
  </a>
</div>

## Quickstart

Requirements: Node (20+), pnpm (10+)

```bash
pnpm add -g sunpeak
sunpeak new
```

## Overview

`sunpeak` is an npm package that helps you build MCP Apps (interactive UI [resources](https://sunpeak.ai/docs/mcp-apps/mcp/resources)) while keeping your [MCP server](https://sunpeak.ai/docs/mcp-apps/mcp/overview) client-agnostic. Built on the [MCP Apps SDK](https://github.com/modelcontextprotocol/ext-apps) (`@modelcontextprotocol/ext-apps`). `sunpeak` consists of:

### The `sunpeak` library

1. Runtime APIs: Strongly typed React hooks for interacting with the host runtime (`useApp`, `useToolData`, `useAppState`, `useHostContext`, `useUpdateModelContext`, `useAppTools`), architected to **support generic and platform-specific features** (ChatGPT, Claude, etc.). Platform-specific hooks like `useUploadFile`, `useRequestModal`, and `useRequestCheckout` are available via `sunpeak/platform/chatgpt`, with `isChatGPT()` / `isClaude()` platform detection via `sunpeak/platform`.
2. Multi-host simulator: React component replicating host runtimes (ChatGPT, Claude) to **test Apps locally and automatically** via UI, props, or URL parameters.
3. MCP server: Serve Resources with mock data to hosts like ChatGPT and Claude with HMR (**no more cache issues or 5-click manual refreshes**).

### The `sunpeak` framework

Next.js for MCP Apps. Using an example App `my-app` with a `Review` UI ([MCP resource](https://sunpeak.ai/docs/mcp-apps/mcp/resources)), `sunpeak` projects look like:

```bash
my-app/
├── src/
│   ├── resources/
│   │   └── review/
│   │       └── review.tsx   # Review UI component + resource metadata.
│   ├── tools/
│   │   ├── review-diff.ts   # Tool with handler, schema, and resource reference.
│   │   └── review-post.ts   # Multiple tools can share one resource.
│   └── server.ts            # Optional: auth, server config.
├── tests/simulations/
│   ├── review-diff.json     # Mock state for testing.
│   └── review-post.json     # Mock state for testing.
└── package.json
```

1. Project scaffold: Complete development setup with the `sunpeak` library.
2. UI components: Production-ready components following MCP App design guidelines.
3. Convention over configuration:
   1. Create a UI by creating a `.tsx` file in `src/resources/{name}/` that exports a `ResourceConfig` and a React component ([example below](#resource-component)).
   2. Create a tool by creating a `.ts` file in `src/tools/` that exports `tool` (metadata with resource reference), `schema` (Zod), and a `default` handler ([example below](#tool-file)).
   3. Create test state (`Simulation`s) by creating a `.json` file in `tests/simulations/` ([example below](#simulation)).

### The `sunpeak` CLI

Commands for managing MCP Apps:

- `sunpeak new [name] [resources]` - Create a new project
- `sunpeak dev` - Start dev server with MCP endpoint and live simulator
- `sunpeak build` - Build resources and compile tools for production
- `sunpeak start` - Start the production MCP server (real handlers, auth, Zod validation)
- `sunpeak upgrade` - Upgrade sunpeak to latest version

## Example App

Example `Resource`, `Simulation`, and testing file (using the `Simulator`) for an [MCP resource](https://sunpeak.ai/docs/mcp-apps/mcp/resources) called "Review".

### `Resource` Component

Each resource `.tsx` file exports both the React component and the [MCP resource](https://sunpeak.ai/docs/mcp-apps/mcp/resources) metadata:

```tsx
// src/resources/review/review.tsx

import { useToolData } from 'sunpeak';
import type { ResourceConfig } from 'sunpeak';

export const resource: ResourceConfig = {
  description: 'Visualize and review a code change',
  _meta: { ui: { csp: { resourceDomains: ['https://cdn.example.com'] } } },
};

export function ReviewResource() {
  const { output: data } = useToolData<unknown, { title: string }>();

  return <h1>Review: {data?.title}</h1>;
}
```

### Tool File

Each tool `.ts` file exports metadata (with a direct resource reference), a Zod schema, and a handler:

```ts
// src/tools/review-diff.ts

import { z } from 'zod';
import type { AppToolConfig, ToolHandlerExtra } from 'sunpeak/mcp';

export const tool: AppToolConfig = {
  resource: 'review',
  title: 'Diff Review',
  description: 'Show a review dialog for a proposed code diff',
  annotations: { readOnlyHint: false },
  _meta: { ui: { visibility: ['model', 'app'] } },
};

export const schema = {
  changesetId: z.string().describe('Unique identifier for the changeset'),
  title: z.string().describe('Title describing the changes'),
};

type Args = z.infer<z.ZodObject<typeof schema>>;

export default async function (args: Args, extra: ToolHandlerExtra) {
  return { structuredContent: { title: args.title, sections: [] } };
}
```

### `Simulation`

Simulation files provide fixture data for testing. Each references a tool by filename and contains the mock input/output:

```jsonc
// tests/simulations/review-diff.json

{
  "tool": "review-diff",                      // References src/tools/review-diff.ts
  "userMessage": "Refactor the auth module to use JWT tokens.",
  "toolInput": {
    "changesetId": "cs_789",
    "title": "Refactor Authentication Module"
  },
  "toolResult": {
    "structuredContent": {
      "title": "Refactor Authentication Module",
      "sections": [...]
    }
  }
}
```

### `Simulator`

```bash
├── tests/e2e/
│   └── review.spec.ts # This! (not pictured above for simplicity)
└── package.json
```

The `Simulator` allows you to set **host state** (like host platform, light/dark mode) via URL params, which can be rendered alongside your `Simulation`s and tested via pre-configured Playwright end-to-end tests (`.spec.ts`).

Using the `Simulator` and `Simulation`s, you can test all possible App states locally and automatically across hosts (ChatGPT, Claude)!

```ts
// tests/e2e/review.spec.ts

import { test, expect } from '@playwright/test';
import { createSimulatorUrl } from 'sunpeak/simulator';

const hosts = ['chatgpt', 'claude'] as const;

for (const host of hosts) {
  test.describe(`Review Resource [${host}]`, () => {
    test.describe('Light Mode', () => {
      test('should render review title with correct styles', async ({ page }) => {
        const params = { simulation: 'review-diff', theme: 'light', host }; // Set sim & host state.
        await page.goto(createSimulatorUrl(params));

        // Resource content renders inside an iframe
        const iframe = page.frameLocator('iframe');
        const title = iframe.locator('h1:has-text("Refactor Authentication Module")');
        await expect(title).toBeVisible();

        const color = await title.evaluate((el) => window.getComputedStyle(el).color);

        // Light mode should render dark text.
        expect(color).toBe('rgb(13, 13, 13)');
      });
    });
  });
}
```

## Coding Agent Skill

Install the `create-sunpeak-app` skill to give your coding agent (Claude Code, Cursor, etc.) built-in knowledge of sunpeak patterns, hooks, simulation files, and testing conventions:

```bash
npx skills add Sunpeak-AI/sunpeak@create-sunpeak-app
```

## Resources

- [MCP Apps Documentation](https://sunpeak.ai/docs/mcp-apps/introduction)
- [MCP Overview](https://sunpeak.ai/docs/mcp-apps/mcp/overview) · [Tools](https://sunpeak.ai/docs/mcp-apps/mcp/tools) · [Resources](https://sunpeak.ai/docs/mcp-apps/mcp/resources)
- [MCP Apps SDK](https://github.com/modelcontextprotocol/ext-apps)
- [ChatGPT Apps SDK Design Guidelines](https://developers.openai.com/apps-sdk/concepts/design-guidelines)
