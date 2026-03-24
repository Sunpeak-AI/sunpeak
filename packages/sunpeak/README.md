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

Inspector, testing framework, and app framework for MCP Apps.

[Demo (Hosted)](https://sunpeak.ai/inspector) ~
[Demo (Video)](https://cdn.sunpeak.ai/sunpeak-demo-prod.mp4) ~
[Discord](https://discord.gg/FB2QNXqRnw) ~
[Documentation](https://sunpeak.ai/docs) ~
[GitHub](https://github.com/Sunpeak-AI/sunpeak)

## sunpeak is three things

### 1. Inspector

Test any MCP server in replicated ChatGPT and Claude runtimes — no sunpeak project required.

```bash
sunpeak inspect --server http://localhost:8000/mcp
```

<div align="center">
  <a href="https://sunpeak.ai/docs/mcp-apps-inspector">
    <picture>
      <img alt="Inspector" src="https://cdn.sunpeak.ai/chatgpt-simulator.png">
    </picture>
  </a>
</div>

- Multi-host inspector replicating ChatGPT and Claude runtimes
- Toggle themes, display modes, device types from the sidebar or URL params
- Call real tool handlers or use simulation fixtures for mock data
- Built into `sunpeak dev` for framework users

### 2. Testing Framework

E2E tests against simulated hosts and live tests against real production hosts.

- **Simulations**: JSON fixtures defining reproducible tool states ([example below](#simulation))
- **E2E tests**: Playwright + `createInspectorUrl` against the inspector ([example below](#inspector))
- **Live tests**: Automated browser tests against real ChatGPT via `sunpeak/test`

### 3. App Framework

Next.js for MCP Apps. Convention-over-configuration project structure with the inspector and testing built in.

```bash
sunpeak-app/
├── src/
│   ├── resources/
│   │   └── review/
│   │       └── review.tsx            # Review UI component + resource metadata.
│   ├── tools/
│   │   ├── review-diff.ts            # Tool with handler, schema, and optional resource link.
│   │   ├── review-post.ts            # Multiple tools can share one resource.
│   │   └── review.ts                 # Backend-only tool (no resource, no UI).
│   └── server.ts                     # Optional: auth, server config.
├── tests/simulations/
│   ├── review-diff.json              # Mock state for testing (includes serverTools).
│   ├── review-post.json              # Mock state for testing (includes serverTools).
│   └── review-purchase.json          # Mock state for testing (includes serverTools).
└── package.json
```

- **Runtime APIs**: Strongly typed React hooks (`useToolData`, `useAppState`, `useHostContext`, etc.)
- **Convention over configuration**: Resources, tools, and simulations are auto-discovered
- **Multi-platform**: Build once, deploy to ChatGPT, Claude, and future hosts

## Quickstart

Requirements: Node (20+), pnpm (10+)

```bash
pnpm add -g sunpeak
sunpeak new
```

## CLI

| Command                               | Description                                 |
| ------------------------------------- | ------------------------------------------- |
| `sunpeak new [name] [resources]`      | Create a new project                        |
| `sunpeak dev`                         | Start dev server + inspector + MCP endpoint |
| `sunpeak inspect --server <url\|cmd>` | Inspect any MCP server (standalone)         |
| `sunpeak build`                       | Build resources + tools for production      |
| `sunpeak start`                       | Start production MCP server                 |
| `sunpeak upgrade`                     | Upgrade sunpeak to latest version           |

## Example App

Example `Resource`, `Simulation`, and testing file (using the `Inspector`) for an [MCP resource](https://sunpeak.ai/docs/mcp-apps/mcp/resources) called "Review".

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

Each tool `.ts` file exports metadata (with an optional resource link for UI tools), a Zod schema, and a handler:

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

Simulation files provide fixture data for testing UIs. Each references a tool by filename and contains the mock input/output:

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

### `Inspector`

```bash
├── tests/e2e/
│   └── review.spec.ts # This! (not pictured above for simplicity)
└── package.json
```

The `Inspector` allows you to set **host state** (like host platform, light/dark mode) via URL params, which can be rendered alongside your `Simulation`s and tested via pre-configured Playwright end-to-end tests (`.spec.ts`).

Using the `Inspector` and `Simulation`s, you can test all possible App states locally and automatically across hosts (ChatGPT, Claude)!

```ts
// tests/e2e/review.spec.ts

import { test, expect } from '@playwright/test';
import { createInspectorUrl } from 'sunpeak/inspector';

const hosts = ['chatgpt', 'claude'] as const;

for (const host of hosts) {
  test.describe(`Review Resource [${host}]`, () => {
    test.describe('Light Mode', () => {
      test('should render review title with correct styles', async ({ page }) => {
        const params = { simulation: 'review-diff', theme: 'light', host }; // Set sim & host state.
        await page.goto(createInspectorUrl(params));

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
