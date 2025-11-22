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

The ChatGPT Apps UI SDK. Build and test your ChatGPT App UI locally with approved shadcn React components.

![ChatGPT Simulator](https://sunpeak.ai/images/chatgpt-simulator.png)

**Key Features:**
- 📺 ChatGPT simulator for rapid UI component development.
- 📚 React component library built with [shadcn/ui](https://ui.shadcn.com/) and [Tailwind](https://tailwindcss.com/).
- 📱 Interface for custom components that work across genAI platforms.
- 🤝 Styles that fit the [OpenAI design system](https://developers.openai.com/apps-sdk/build/chatgpt-ui).
- 🧪 Testing framework that replicates advanced ChatGPT behavior locally.

## Quickstart

Requirements: Node (20+), pnpm (10+)

```bash
pnpm dlx sunpeak init my-app
cd my-app && pnpm dev
```

## Supported Platforms

- ✅ **OpenAI ChatGPT** - Fully supported ([design guidelines](https://developers.openai.com/apps-sdk/concepts/design-guidelines))
- 🔄 **Google Gemini** - Design system available (SDK support coming soon)
- 🔄 **Anthropic Claude** - Design system available (SDK support coming soon)
- 🔧 **Custom platforms** - Implement your own platform adapter

## Contributing

We welcome your contributions!

For development quickstart on this package, see [DEVELOPMENT.md](./DEVELOPMENT.md).

## Resources

- [ChatGPT Apps SDK Design Guidelines](https://developers.openai.com/apps-sdk/concepts/design-guidelines)
- [ChatGPT Apps SDK UI Documentation](https://developers.openai.com/apps-sdk/build/chatgpt-ui)
- [ChatGPT Apps SDK Examples](https://github.com/openai/openai-apps-sdk-examples)
