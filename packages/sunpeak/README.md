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

MCP App framework, MCP testing framework, and inspector for MCP servers and MCP Apps.

Build cross-platform: sunpeak is a ChatGPT App framework, Claude Connector framework, and more.

```bash
npx sunpeak new
```

[Demo (Hosted)](https://sunpeak.ai/inspector) ~
[Demo (Video)](https://cdn.sunpeak.ai/sunpeak-demo-prod.mp4) ~
[Discord](https://discord.gg/FB2QNXqRnw) ~
[Documentation](https://sunpeak.ai/docs) ~
[GitHub](https://github.com/Sunpeak-AI/sunpeak)

## sunpeak is three things

### 1. App Framework

Building an MCP App from scratch means wiring up an MCP server, handling protocol message routing, managing resource HTML bundles, and setting up a dev environment with hot reload. Each host has different capabilities and CSS variables, so you end up writing platform-specific code without a clear structure.

sunpeak gives you a convention-over-configuration framework with the inspector and testing built in.

```bash
npx sunpeak new
```

This creates a project, starts a dev server with HMR, and opens the inspector at `localhost:3000`:

```
sunpeak-app/
├── src/resources/review/review.tsx    # UI component (React)
├── src/tools/review-diff.ts           # Tool handler, schema, resource link
├── tests/simulations/review-diff.json # Mock data for the inspector
└── package.json
```

Tools, resources, and simulations are auto-discovered from the file system. Multi-platform React hooks (`useToolData`, `useAppState`, `useTheme`, `useDisplayMode`) let you write your app logic once and deploy it across ChatGPT, Claude, and future hosts.

[App framework documentation →](https://sunpeak.ai/docs/mcp-apps-framework)

---

### 2. Testing Framework

MCP Apps render inside host iframes with host-specific themes, display modes, and capabilities. Standard browser testing can't replicate this because the runtime environment only exists inside ChatGPT and Claude. Each app also has many dimensions of state: tool inputs, tool results, server tool responses, host context, and display configuration. Testing all combinations manually is slow and error-prone.

sunpeak replicates these host runtimes and provides simulation fixtures (JSON files that define reproducible tool states) so you can test every combination of host, theme, and data in CI without accounts or API credits.

```bash
npx sunpeak test init --server http://localhost:8000/mcp
```

This scaffolds E2E tests, visual regression, live host tests, and multi-model evals. Then run them:

```bash
npx sunpeak test
```

Playwright fixtures handle inspector startup, MCP connection, iframe traversal, and host switching. Works with Python, Go, TypeScript, Rust, or any language.

```ts
import { test, expect } from 'sunpeak/test';

test('search tool returns results', async ({ mcp }) => {
  const result = await mcp.callTool('search', { query: 'headphones' });
  expect(result.isError).toBeFalsy();
});

test('album cards render', async ({ inspector }) => {
  const result = await inspector.renderTool('show-albums');
  await expect(result.app().locator('button:has-text("Summer Slice")')).toBeVisible();
});
```

[Testing documentation →](https://sunpeak.ai/docs/testing/overview)

---

### 3. Inspector

MCP servers are opaque. You can call tools and read the JSON responses, but you can't see how your app actually looks and behaves inside ChatGPT or Claude without deploying to each host, setting up a tunnel, paying for accounts, and manually refreshing through a multi-step cycle on every code change.

The sunpeak inspector replicates the ChatGPT and Claude app runtimes locally. Point it at any MCP server and see your tools and resources rendered the same way they appear in production hosts.

```bash
npx sunpeak inspect --server http://localhost:8000/mcp
```

<div align="center">
  <a href="https://sunpeak.ai/docs/mcp-apps-inspector">
    <picture>
      <img alt="Inspector" src="https://cdn.sunpeak.ai/chatgpt-simulator.png">
    </picture>
  </a>
</div>

Toggle between hosts, themes, display modes, and device types from the sidebar. Call real tool handlers or load simulation fixtures for deterministic mock data. Changes reflect instantly via HMR. Works with any MCP server in any language.

[Inspector documentation →](https://sunpeak.ai/docs/mcp-apps-inspector)

## Resources

- [MCP Apps Documentation](https://sunpeak.ai/docs/mcp-apps/introduction)
- [MCP Overview](https://sunpeak.ai/docs/mcp-apps/mcp/overview) · [Tools](https://sunpeak.ai/docs/mcp-apps/mcp/tools) · [Resources](https://sunpeak.ai/docs/mcp-apps/mcp/resources)
- [MCP Apps SDK](https://github.com/modelcontextprotocol/ext-apps)
- [ChatGPT Apps SDK Design Guidelines](https://developers.openai.com/apps-sdk/concepts/design-guidelines)
- [Troubleshooting](https://sunpeak.ai/docs/app-framework/guides/troubleshooting)
