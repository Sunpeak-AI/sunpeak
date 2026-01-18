<div align="center">
  <a href="https://sunpeak.ai">
    <picture>
      <img alt="Sunpeak logo" src="https://d10djik02wlf6x.cloudfront.net/sunpeak-github.svg">
    </picture>
  </a>
</div>

# sunpeak

[![npm version](https://img.shields.io/npm/v/sunpeak.svg?style=flat-square)](https://www.npmjs.com/package/sunpeak)
[![npm downloads](https://img.shields.io/npm/dm/sunpeak.svg?style=flat-square)](https://www.npmjs.com/package/sunpeak)
[![CI](https://img.shields.io/github/actions/workflow/status/Sunpeak-AI/sunpeak/ci.yml?branch=main&style=flat-square&label=CI)](https://github.com/Sunpeak-AI/sunpeak/actions)
[![License](https://img.shields.io/npm/l/sunpeak.svg?style=flat-square)](https://github.com/Sunpeak-AI/sunpeak/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react)](https://reactjs.org/)

The ChatGPT App framework.

Quickstart, build, test, and ship your ChatGPT App—locally!

[Demo (Hosted)](https://sunpeak.ai/#simulator) ~
[Demo (Video)](https://d10djik02wlf6x.cloudfront.net/sunpeak-demo-prod.mp4) ~
[Discord (NEW)](https://discord.gg/FB2QNXqRnw) ~
[Documentation](https://docs.sunpeak.ai/) ~
[GitHub](https://github.com/Sunpeak-AI/sunpeak) ~
[Resource Repository](https://app.sunpeak.ai/)

<div align="center">
  <a href="https://docs.sunpeak.ai/library/chatgpt-simulator">
    <picture>
      <img alt="ChatGPT Simulator" src="https://d10djik02wlf6x.cloudfront.net/chatgpt-simulator.png">
    </picture>
  </a>
</div>

## Quickstart

Requirements: Node (20+), pnpm (10+)

```bash
pnpm add -g sunpeak
sunpeak new
```

To add sunpeak to an existing project, refer to the [documentation](https://docs.sunpeak.ai/add-to-existing-project).

## Overview

sunpeak is an npm package that helps you build ChatGPT Apps (MCP Resources) while keeping your MCP server client-agnostic. sunpeak consists of:

### The `sunpeak` library (`./src`)

1. Runtime APIs: Strongly typed APIs for interacting with the ChatGPT runtime, **architected to support future platforms** (Gemini, Claude, etc.).
2. ChatGPT simulator: React component replicating ChatGPT's runtime to **test Apps locally and automatically**.
3. MCP server: Serve Resources with mock data to the real ChatGPT with HMR (**no more cache issues or 5-click manual refreshes**).

### The `sunpeak` framework (`./template`)

Next.js for ChatGPT Apps. Using a Review page as an example, sunpeak projects look like:

```bash
my-app/
├── src/resources/
│   └── review/
│       ├── review-resource.tsx                 # Review UI component.
│       └── review-resource.json                # Review UI MCP metadata.
├── tests/simulations/
│   └── review/
│       ├── review-{scenario1}-simulation.json  # Mock state for testing.
│       └── review-{scenario2}-simulation.json  # Mock state for testing.
└── package.json
```

1. Project scaffold: Complete development setup with the sunpeak library.
2. UI components: Production-ready components following ChatGPT design guidelines and using OpenAI apps-sdk-ui React components.
3. Convention over configuration:
   1. Create UIs by creating a `-resource.tsx` component file ([example](#resource-component)) and `-resource.json` MCP metadata file ([example](#resource-mcp-metadata)).
   2. Create test state (simulations) for local dev, ChatGPT dev, automated testing, and demos by creating a `-simulation.json` file. ([example](#simulation))

### The `sunpeak` CLI (`./bin`)

Commands for managing ChatGPT Apps. Includes a client for the [sunpeak Resource Repository](https://app.sunpeak.ai/). The repository helps you & your CI/CD decouple your App from your client-agnostic MCP server while also providing a hosted runtime to collaborate, demo, and share your ChatGPT Apps.

Think Docker Hub for ChatGPT Apps:

<div align="center">
  <a href="https://docs.sunpeak.ai/library/chatgpt-simulator">
    <picture>
      <img alt="ChatGPT Resource Repository" src="https://d10djik02wlf6x.cloudfront.net/blog/storybook-for-chatgpt-apps.png">
    </picture>
  </a>
</div>

1. Tag your app builds with version numbers and environment names (like `v1.0.0` and `prod`)
2. `push` built Apps to a central location
3. `pull` built Apps to be run in different environments, like your production MCP server.
4. Share your fully-functional demo Apps with teammates, prospects, and strangers!

## Examples

Example sunpeak resource & simulation files for an MCP Resource called "Review".

### Resource Component

React component defining a UI (MCP Resource) in your ChatGPT App.

```tsx
// src/resources/review-resource.tsx
import { Card } from './components';

export function ReviewResource() {
  return (
    <Card
      image="https://images.unsplash.com/photo-1520950237264-dfe336995c34"
      imageAlt="Lady Bird Lake"
      header="Lady Bird Lake"
      metadata="⭐ 4.5 • Austin, TX"
      button1={{ children: 'Visit', isPrimary: true, onClick: () => {} }}
      button2={{ children: 'Learn More', onClick: () => {} }}
    >
      Scenic lake perfect for kayaking, paddleboarding, and trails.
    </Card>
  );
}
```

### Resource MCP Metadata

MCP metadata for your UI. Version your resource metadata alongside the resource itself.

This is just an official [MCP Resource object](https://modelcontextprotocol.io/specification/2025-11-25/server/resources#resource).

```jsonc
// src/resources/review-resource.json
{
  "name": "review",
  "title": "Review",
  "description": "Visualize and review a proposed set of changes or actions",
  "mimeType": "text/html+skybridge",
  "_meta": {
    "openai/widgetDomain": "https://sunpeak.ai",
    "openai/widgetCSP": {
      "resource_domains": ["https://cdn.openai.com"],
    },
  },
}
```

### Simulation

`sunpeak` object. Testing a ChatGPT App require setting a lot of state: state in your backend (accessed via MCP tool), the stored widget runtime, and ChatGPT itself.

Simulation files let you define key App states for development, automated testing, and demo purposes.

Simulation files contain an [official MCP Tool object](https://modelcontextprotocol.io/specification/2025-11-25/server/tools#tool) and an [official MCP CallToolResult object](https://modelcontextprotocol.io/specification/2025-11-25/server/tools#structured-content). ChatGPT state (like light/dark mode) is not set on the simulation, but rather on the sunpeak `ChatGPTSimulator` itself via UI, props, or URL params.

```jsonc
// tests/simulations/review-diff-simulation.json
{
  "userMessage": "Refactor the authentication module", // Simulator styling.
  // Official MCP Tool object.
  "tool": {
    "name": "diff-review",
    "description": "Show a review dialog for a proposed code diff",
    "inputSchema": { "type": "object", "properties": {}, "additionalProperties": false },
    "title": "Diff Review",
    "annotations": { "readOnlyHint": false },
    "_meta": {
      "openai/toolInvocation/invoking": "Preparing changes",
      "openai/toolInvocation/invoked": "Changes ready for review",
      "openai/widgetAccessible": true,
      "openai/resultCanProduceWidget": true,
    },
  },
  // Official MCP CallToolResult object.
  "callToolResult": {
    "structuredContent": {
      // ...
    },
    "_meta": {},
  },
}
```

## Resources

- [ChatGPT Apps SDK Design Guidelines](https://developers.openai.com/apps-sdk/concepts/design-guidelines)
- [ChatGPT Apps SDK Documentation - UI](https://developers.openai.com/apps-sdk/build/chatgpt-ui)
- [ChatGPT Apps SDK window.openai Reference](https://developers.openai.com/apps-sdk/build/mcp-server#understand-the-windowopenai-widget-runtime)
- [ChatGPT Apps SDK Examples](https://github.com/openai/openai-apps-sdk-examples)
- [ChatGPT Apps SDK UI Documentation](https://openai.github.io/apps-sdk-ui/)
