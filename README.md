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

Quickstart, build, test, and ship your ChatGPT App locally!

[Demo (Hosted)](https://sunpeak.ai/#simulator) ~
[Demo (Video)](https://d10djik02wlf6x.cloudfront.net/sunpeak-demo-prod.mp4) ~
[Discord (NEW)](https://discord.gg/FB2QNXqRnw) ~
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
pnpm add -g sunpeak
sunpeak new
```

To add sunpeak to an existing project, refer to the [documentation](https://docs.sunpeak.ai/add-to-existing-project).

## Overview

sunpeak is an npm package consisting of:

1. **The `sunpeak` library** (`./src`). An npm package for running & testing ChatGPT Apps. This standalone library contains:
   1. Runtime APIs - Strongly typed, multi-platform APIs for interacting with the ChatGPT runtime, architected to support future platforms (Gemini, Claude).
   2. ChatGPT simulator - React component replicating ChatGPT's runtime.
   3. MCP server - Mock data MCP server for testing local UIs (resources) in the real ChatGPT.
2. **The `sunpeak` framework** (`./template`). Next.js for ChatGPT Apps. This templated npm package includes:
   1. Project scaffold - Complete development setup with build, test, and mcp tooling, including the sunpeak library.
   2. UI components - Production-ready components following ChatGPT design guidelines and using OpenAI apps-sdk-ui React components.
   3. Convention over configuration - Create UIs (resources) by simply creating a `src/resources/NAME-resource.tsx` React file and `src/resources/NAME-resource.json` metadata file.
3. **The `sunpeak` CLI** (`./bin`). Commands for managing ChatGPT Apps. Includes a client for the [sunpeak Resource Repository](https://app.sunpeak.ai/) (ECR for ChatGPT Apps). The repository helps you & your CI/CD decouple your App from your client-agnostic MCP server:
   1. Tag your app builds with version numbers and environment names (like `v1.0.0` and `prod`)
   2. `push` built Apps to a central location
   3. `pull` built Apps to be run in different environments

Note that each `sunpeak` component can be used in isolation if preferred, though the most seamless experience combines all 3.

## Example Component

```tsx
import { Card } from '../card';

export function MCPResource() {
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

## Resources

- [ChatGPT Apps SDK Design Guidelines](https://developers.openai.com/apps-sdk/concepts/design-guidelines)
- [ChatGPT Apps SDK Documentation - UI](https://developers.openai.com/apps-sdk/build/chatgpt-ui)
- [ChatGPT Apps SDK window.openai Reference](https://developers.openai.com/apps-sdk/build/mcp-server#understand-the-windowopenai-widget-runtime)
- [ChatGPT Apps SDK Examples](https://github.com/openai/openai-apps-sdk-examples)
- [ChatGPT Apps SDK UI Documentation](https://openai.github.io/apps-sdk-ui/)
