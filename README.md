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
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react)](https://reactjs.org/)

The MCP App SDK.

Quickstart, build, and test your ChatGPT App locally with OpenAI apps-sdk-ui React components.

[Demo (Hosted)](https://sunpeak.ai/#simulator) ~
[Demo (Video)](https://d10djik02wlf6x.cloudfront.net/sunpeak-demo-prod.mp4) ~
[Documentation](https://docs.sunpeak.ai/) ~
[GitHub](https://github.com/Sunpeak-AI/sunpeak)

<div align="center">
  <a href="https://docs.sunpeak.ai/library/chatgpt-simulator">
    <picture>
      <img alt="ChatGPT Simulator" src="https://d10djik02wlf6x.cloudfront.net/chatgpt-simulator.png">
    </picture>
  </a>
</div>

## Quickstart

### New Projects

Requirements: Node (20+), pnpm (10+)

```bash
pnpm dlx sunpeak new
```

To add sunpeak to an existing project, refer to the [documentation](https://docs.sunpeak.ai/add-to-existing-project).

## Key Features

- 📺 [ChatGPT simulator](https://docs.sunpeak.ai/library/chatgpt-simulator) for local UI component development.
- 📚 [Pre-built component library](https://docs.sunpeak.ai/template/ui-components) built on [openai/apps-sdk-ui](https://github.com/openai/apps-sdk-ui).
- 📱 [Multi-platform interface](https://docs.sunpeak.ai/library/multi-platform-apis) for portable MCP UI App development.
- 🛜 [Basic MCP server](https://docs.sunpeak.ai/library/mcp-server) to serve your UI to ChatGPT prod out-of-the-box.
- 🧪 [Testing framework](https://docs.sunpeak.ai/guides/testing) that replicates advanced ChatGPT behavior locally.

## Example Component

```tsx
import { Card } from "../card";

export function MCPResource() {
  return (
    <Card
      image="https://images.unsplash.com/photo-1520950237264-dfe336995c34"
      imageAlt="Lady Bird Lake"
      header="Lady Bird Lake"
      metadata="⭐ 4.5 • Austin, TX"
      button1={{ children: "Visit", isPrimary: true, onClick: () => {} }}
      button2={{ children: "Learn More", onClick: () => {} }}
    >
      Scenic lake perfect for kayaking, paddleboarding, and trails.
    </Card>
  );
}
```

## What is sunpeak exactly?

sunpeak is an npm package consisting of:

1. **The `sunpeak` library** (`./src`). This library contains:
   1. Multi-platform APIs - Abstraction layer for the ChatGPT runtime and future platform runtimes (Gemini, Claude).
   2. ChatGPT simulator - Local development environment replicating ChatGPT's runtime.
   3. MCP server - Test local Resources in the real ChatGPT.
2. **The `sunpeak` framework** (`./template`). This templated npm package & MCP App framework includes:
    1. Project scaffold - Complete development setup with build, test, and dev tooling.
    2. Pre-built UI components - Production-ready components following ChatGPT design guidelines.
    3. CLI utility (`./bin`) - Commands for working with the sunpeak framework.

## Contributing

We welcome your contributions!

For development quickstart on this package, see [DEVELOPMENT.md](./DEVELOPMENT.md).

## Resources

- [ChatGPT Apps SDK Design Guidelines](https://developers.openai.com/apps-sdk/concepts/design-guidelines)
- [ChatGPT Apps SDK Documentation - UI](https://developers.openai.com/apps-sdk/build/chatgpt-ui)
- [ChatGPT Apps SDK window.openai Reference](https://developers.openai.com/apps-sdk/build/mcp-server#understand-the-windowopenai-widget-runtime)
- [ChatGPT Apps SDK Examples](https://github.com/openai/openai-apps-sdk-examples)
- [ChatGPT Apps SDK UI Documentation](https://openai.github.io/apps-sdk-ui/)
