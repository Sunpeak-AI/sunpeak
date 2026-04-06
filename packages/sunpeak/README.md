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

Inspector, testing framework, and runtime framework for MCP servers and MCP Apps.

[Demo (Hosted)](https://sunpeak.ai/inspector) ~
[Demo (Video)](https://cdn.sunpeak.ai/sunpeak-demo-prod.mp4) ~
[Discord](https://discord.gg/FB2QNXqRnw) ~
[Documentation](https://sunpeak.ai/docs) ~
[GitHub](https://github.com/Sunpeak-AI/sunpeak)

## sunpeak is three things

### 1. Inspector

Manually test any MCP server in replicated ChatGPT and Claude runtimes.

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

### 2. Testing Framework

Automatically test any MCP server against replicated ChatGPT and Claude runtimes.

```ts
import { test, expect } from 'sunpeak/test';

test('review tool renders title', async ({ mcp }) => {
  const result = await mcp.callTool('review-diff');
  const app = result.app();
  await expect(app.locator('h1:has-text("Refactor")')).toBeVisible();
});
```

- **Works for any MCP server**: `sunpeak test init` scaffolds tests for Python, Go, TS, or any language
- **MCP-native assertions**: `toBeError()`, `toHaveTextContent()`, `toHaveStructuredContent()`
- **Multi-host**: Tests run against ChatGPT and Claude hosts automatically
- **Live tests**: Automated browser tests against real ChatGPT via `sunpeak/test/live`

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

**Testing** (works with any MCP server):

| Command                               | Description                                 |
| ------------------------------------- | ------------------------------------------- |
| `sunpeak inspect --server <url\|cmd>` | Inspect any MCP server in the inspector     |
| `sunpeak test`                        | Run unit + e2e tests                        |
| `sunpeak test --unit`                 | Run unit tests only (Vitest)                |
| `sunpeak test --e2e`                  | Run e2e tests only (Playwright)             |
| `sunpeak test --visual`               | Run e2e tests with visual regression        |
| `sunpeak test --visual --update`      | Update visual regression baselines          |
| `sunpeak test --live`                 | Run live tests against real hosts           |
| `sunpeak test init`                   | Scaffold test infrastructure into a project |

**App framework** (for sunpeak projects):

| Command                          | Description                                 |
| -------------------------------- | ------------------------------------------- |
| `sunpeak new [name] [resources]` | Create a new project                        |
| `sunpeak dev`                    | Start dev server + inspector + MCP endpoint |
| `sunpeak build`                  | Build resources + tools for production      |
| `sunpeak start`                  | Start production MCP server                 |
| `sunpeak upgrade`                | Upgrade sunpeak to latest version           |

## Coding Agent Skill

Install the `create-sunpeak-app` skill to give your coding agent (Claude Code, Cursor, etc.) built-in knowledge of sunpeak patterns, hooks, simulation files, and testing conventions:

```bash
npx skills add Sunpeak-AI/sunpeak@create-sunpeak-app
```

## Troubleshooting

If your app doesn't render in ChatGPT or Claude:

1. **Check your tunnel** is running and pointing to the correct port
2. **Restart `sunpeak dev`** to clear stale connections
3. **Refresh or re-add the MCP server** in the host's settings (Settings > MCP Servers)
4. **Hard refresh** the host page (`Cmd+Shift+R` / `Ctrl+Shift+R`)
5. **Open a new chat** in the host (cached iframes persist per-conversation)

Full guide: [sunpeak.ai/docs/guides/troubleshooting](https://sunpeak.ai/docs/guides/troubleshooting)

## Resources

- [MCP Apps Documentation](https://sunpeak.ai/docs/mcp-apps/introduction)
- [MCP Overview](https://sunpeak.ai/docs/mcp-apps/mcp/overview) · [Tools](https://sunpeak.ai/docs/mcp-apps/mcp/tools) · [Resources](https://sunpeak.ai/docs/mcp-apps/mcp/resources)
- [MCP Apps SDK](https://github.com/modelcontextprotocol/ext-apps)
- [ChatGPT Apps SDK Design Guidelines](https://developers.openai.com/apps-sdk/concepts/design-guidelines)
