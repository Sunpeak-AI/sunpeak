<div align="center">
  <a href="https://sunpeak.ai">
    <picture>
      <img alt="Sunpeak logo" src="https://sunpeak.ai/images/sunpeak_github.svg">
    </picture>
  </a>
</div>

# sunpeak

[![npm version](https://img.shields.io/npm/v/sunpeak.svg?style=flat-square)](https://www.npmjs.com/package/sunpeak)
[![npm downloads](https://img.shields.io/npm/dm/sunpeak.svg?style=flat-square)](https://www.npmjs.com/package/sunpeak)
[![CI](https://img.shields.io/github/actions/workflow/status/Sunpeak-AI/sunpeak/ci.yml?branch=main&style=flat-square&label=CI)](https://github.com/Sunpeak-AI/sunpeak/actions)
[![License](https://img.shields.io/npm/l/sunpeak.svg?style=flat-square)](https://github.com/Sunpeak-AI/sunpeak/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18%20%7C%2019-blue?style=flat-square&logo=react)](https://reactjs.org/)

The ChatGPT Apps UI SDK.

Build and test your ChatGPT App UI locally with apps-sdk-ui React components.

![ChatGPT Simulator](https://sunpeak.ai/images/chatgpt-simulator.png)

## Quickstart 

### New Projects

Requirements: Node (20+), pnpm (10+)

```bash
pnpm dlx sunpeak init
```

### Existing Projects

Requirements: React (18+), Tailwind 4

```bash
pnpm add sunpeak
```

## Key Features
- 📺 ChatGPT simulator for local UI component development.
- 📚 Pre-built component library built on [openai/apps-sdk-ui](https://github.com/openai/apps-sdk-ui).
- 📱 Interface for cross-platforms MCP UI App development.
- 🛜 Basic MCP server to serve your UI to ChatGPT prod out-of-the-box.
- 🧪 Testing framework that replicates advanced ChatGPT behavior locally.

## Example Component
```tsx
import '@/styles/globals.css';
import { OpenAICard } from "@/components";

export default function App() {
  return (
    <OpenAICard
      image="https://example.com/photo.jpg"
      imageAlt="Lady Bird Lake"
      header="Lady Bird Lake"
      metadata="⭐ 4.5 • Austin, TX"
      button1={{ children: "Visit", isPrimary: true, onClick: () => {} }}
      button2={{ children: "Learn More", onClick: () => {} }}
    >
      Scenic lake perfect for kayaking, paddleboarding, and trails.
    </OpenAICard>
  );
}
```

## Supported Platforms

- ✅ **OpenAI ChatGPT** - Fully supported ([design guidelines](https://developers.openai.com/apps-sdk/concepts/design-guidelines))
- 🔄 **Google Gemini** - Design system available (SDK support coming soon)
- 🔄 **Anthropic Claude** - Design system available (SDK support coming soon)
- 🔧 **Custom platforms** - Implement your own platform adapter

## What is sunpeak exactly?

sunpeak is an npm package consisting of:

1. **A CLI utility** for working with sunpeak (`./bin`).
2. **A `sunpeak` library** (`./src`). This library contains common runtime APIs and testing utilities, including a ChatGPT simulator, to be used as a dependency by sunpeak projects.
3. **A templated npm package** (`./template`) that is initialized by the CLI to help developers set up sunpeak projects. These projects have the `sunpeak` dependency already wired up alongside a collection of pre-built UI components (`./template/src/components`) to copy, modify, or use as an example.
    1. Developers build their UI in the `App` component.

## Contributing

We welcome your contributions!

For development quickstart on this package, see [DEVELOPMENT.md](./DEVELOPMENT.md).

## Resources

- [ChatGPT Apps SDK Design Guidelines](https://developers.openai.com/apps-sdk/concepts/design-guidelines)
- [ChatGPT Apps SDK UI Documentation](https://developers.openai.com/apps-sdk/build/chatgpt-ui)
- [ChatGPT Apps SDK window.openai Reference](https://developers.openai.com/apps-sdk/build/mcp-server#understand-the-windowopenai-widget-runtime)
- [ChatGPT Apps SDK Examples](https://github.com/openai/openai-apps-sdk-examples)
