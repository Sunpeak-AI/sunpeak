<div align="center">
  <a href="https://sunpeak.ai">
    <picture>
      <img alt="Sunpeak logo" src="https://cdn.sunpeak.ai/sunpeak-github.svg">
    </picture>
  </a>
</div>

# sunpeak

[![npm version](https://img.shields.io/npm/v/sunpeak.svg?style=flat&color=FFB800&labelColor=1A1F36)](https://www.npmjs.com/package/sunpeak)
[![npm downloads](https://img.shields.io/npm/dm/sunpeak.svg?style=flat&color=FFB800&labelColor=1A1F36)](https://www.npmjs.com/package/sunpeak)
[![stars](https://img.shields.io/github/stars/Sunpeak-AI/sunpeak?style=flat&color=FFB800&labelColor=1A1F36)](https://github.com/Sunpeak-AI/sunpeak)
[![CI](https://img.shields.io/github/actions/workflow/status/Sunpeak-AI/sunpeak/ci.yml?branch=main&style=flat&label=ci&color=FFB800&labelColor=1A1F36)](https://github.com/Sunpeak-AI/sunpeak/actions)
[![License](https://img.shields.io/npm/l/sunpeak.svg?style=flat&color=FFB800&labelColor=1A1F36)](https://github.com/Sunpeak-AI/sunpeak/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?style=flat&logo=typescript&label=ts&color=FFB800&logoColor=white&labelColor=1A1F36)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=flat&logo=react&label=react&color=FFB800&logoColor=white&labelColor=1A1F36)](https://reactjs.org/)

Local-first MCP Apps framework.

Quickstart, build, test, and ship your Claude or ChatGPT App!

[Demo (Hosted)](https://sunpeak.ai/simulator) ~
[Demo (Video)](https://cdn.sunpeak.ai/sunpeak-demo-prod.mp4) ~
[Discord (NEW)](https://discord.gg/FB2QNXqRnw) ~
[Documentation](https://docs.sunpeak.ai/) ~
[GitHub](https://github.com/Sunpeak-AI/sunpeak) ~
[Resource Repository](https://app.sunpeak.ai/)

<div align="center">
  <a href="https://docs.sunpeak.ai/library/chatgpt-simulator">
    <picture>
      <img alt="ChatGPT Simulator" src="https://cdn.sunpeak.ai/chatgpt-simulator.png">
    </picture>
  </a>
</div>

## Quickstart

Requirements: Node (20+), pnpm (10+)

```bash
pnpm add -g sunpeak
sunpeak new
```

To add `sunpeak` to an existing project, refer to the [documentation](https://docs.sunpeak.ai/add-to-existing-project).

## Overview

`sunpeak` is an npm package that helps you build MCP Apps (interactive UI resources) while keeping your MCP server client-agnostic. Built on the [MCP Apps SDK](https://github.com/modelcontextprotocol/ext-apps) (`@modelcontextprotocol/ext-apps`). `sunpeak` consists of:

### The `sunpeak` library

1. Runtime APIs: Strongly typed React hooks for interacting with the host runtime (`useApp`, `useToolData`, `useAppState`, `useHostContext`), architected to **support generic and platforms-specific features** (ChatGPT, Claude, etc.).
2. ChatGPT simulator: React component replicating ChatGPT's runtime to **test Apps locally and automatically** via UI, props, or URL parameters.
3. MCP server: Serve Resources with mock data to the real ChatGPT with HMR (**no more cache issues or 5-click manual refreshes**).

### The `sunpeak` framework

Next.js for MCP Apps. Using an example App `my-app` with a `Review` UI (MCP resource), `sunpeak` projects look like:

```bash
my-app/
├── src/resources/
│   └── review/
│       └── review-resource.tsx                 # Review UI component + resource metadata.
├── tests/simulations/
│   └── review/
│       ├── review-{scenario1}-simulation.json  # Mock state for testing.
│       └── review-{scenario2}-simulation.json  # Mock state for testing.
└── package.json
```

1. Project scaffold: Complete development setup with the `sunpeak` library.
2. UI components: Production-ready components following ChatGPT design guidelines and using OpenAI `apps-sdk-ui` React components.
3. Convention over configuration:
   1. Create a UI by creating a `-resource.tsx` file that exports a `ResourceConfig` and a React component ([example below](#resource-component)).
   2. Create test state (`Simulation`s) for local dev, ChatGPT dev, automated testing, and demos by creating a `-simulation.json` file. ([example below](#simulation))

### The `sunpeak` CLI

Commands for managing MCP Apps. Includes a client for the [sunpeak Resource Repository](https://app.sunpeak.ai/). The repository helps you & your CI/CD decouple your App from your client-agnostic MCP server while also providing a hosted runtime to collaborate, demo, and share your MCP Apps.

Think Docker Hub for MCP Apps:

<div align="center">
  <a href="https://docs.sunpeak.ai/library/chatgpt-simulator">
    <picture>
      <img alt="ChatGPT Resource Repository" src="https://cdn.sunpeak.ai/blog/storybook-for-chatgpt-apps.png">
    </picture>
  </a>
</div>

1. Tag your app builds with version numbers and environment names (like `v1.0.0` and `prod`)
2. `sunpeak push` built Apps to a central location
3. `sunpeak pull` built Apps to be run in different environments, like your production MCP server.
4. Share your fully-functional demo Apps with teammates, prospects, and strangers!

## Example App

Example `Resource`, `Simulation`, and testing file (using `ChatGPTSimulator`) for an MCP resource called "Review".

### `Resource` Component

```bash
my-app/
├── src/resources/
│   └── review/
│       └── review-resource.tsx # This!
```

Each resource `.tsx` file exports both the React component and the MCP resource metadata:

```tsx
// src/resources/review/review-resource.tsx

import { useToolData } from 'sunpeak';
import type { ResourceConfig } from 'sunpeak';

export const resource: ResourceConfig = {
  name: 'review',
  description: 'Visualize and review a code change',
  _meta: { ui: { csp: { resourceDomains: ['https://cdn.openai.com'] } } },
};

export function ReviewResource() {
  const { output: data } = useToolData<unknown, { title: string }>();

  return <h1>Review: {data?.title}</h1>;
}
```

### `Simulation`

```bash
├── tests/simulations/
│   └── review/
│       ├── review-{scenario1}-simulation.json  # These!
│       └── review-{scenario2}-simulation.json  # These!
```

`sunpeak` testing object (`.json`) defining key App-owned states.

Testing an MCP App requires setting a lot of state: state in your **backend**, **MCP tools**, and the **host runtime**.

`Simulation` files contain an [official MCP tool object](https://modelcontextprotocol.io/specification/2025-11-25/server/tools#tool), `toolInput` (the arguments sent to CallTool), and `toolResult` (the [CallToolResult](https://modelcontextprotocol.io/specification/2025-11-25/server/tools#structured-content) response) so you can define **backend**, **tool**, and **runtime** states for testing.

```jsonc
// tests/simulations/review-diff-simulation.json

{
  // Official MCP tool object.
  "tool": {
    "name": "review-diff",
    "description": "Show a review dialog for a proposed code diff",
    "inputSchema": { "type": "object", "properties": {}, "additionalProperties": false },
    "title": "Diff Review",
    "annotations": { "readOnlyHint": false },
    "_meta": {
      "ui": { "visibility": ["model", "app"] },
    },
  },
  // Tool input arguments (sent to CallTool).
  "toolInput": {
    "changesetId": "cs_789",
    "title": "Refactor Authentication Module",
  },
  // Tool result data (CallToolResult response).
  "toolResult": {
    "structuredContent": {
      "title": "Refactor Authentication Module",
      // ...
    },
  },
}
```

### `ChatGPTSimulator`

```bash
├── tests/e2e/
│   └── review.spec.ts # This! (not pictured above for simplicity)
└── package.json
```

The `ChatGPTSimulator` allows you to set **host state** (like light/dark mode) via URL params, which can be rendered alongside your `Simulation`s and tested via pre-configured Playwright end-to-end tests (`.spec.ts`).

Using the `ChatGPTSimulator` and `Simulation`s, you can test all possible App states locally and automatically!

```ts
// tests/e2e/review.spec.ts

import { test, expect } from '@playwright/test';
import { createSimulatorUrl } from 'sunpeak/chatgpt';

test.describe('Review Resource', () => {
  test.describe('Light Mode', () => {
    test('should render review title with correct styles', async ({ page }) => {
      const params = { simulation: 'review-diff', theme: 'light' }; // Set sim & host state.
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
```

## Resources

- [MCP Apps](https://github.com/modelcontextprotocol/ext-apps)
- [ChatGPT Apps SDK Design Guidelines](https://developers.openai.com/apps-sdk/concepts/design-guidelines)
- [ChatGPT Apps SDK Documentation - UI](https://developers.openai.com/apps-sdk/build/chatgpt-ui)
- [ChatGPT Apps SDK UI Documentation](https://openai.github.io/apps-sdk-ui/)
