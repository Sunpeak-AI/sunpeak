# sunpeak-app

A ChatGPT App UI built with [sunpeak](https://github.com/Sunpeak-AI/sunpeak).

## Quickstart

Requirements: Node (20+), pnpm (10+)

```bash
pnpm dev
```

Edit [src/App.tsx](./src/App.tsx) to build your app UI.

## Development

### Initial Project Structure

```
src/
├── App.tsx          # Your main app component
└── components       # Your shadcn/ui React components

dist/                # Build output (generated)
└── chatgpt/         # ChatGPT builds
```

## Build & Deploy

Build your app for production:

```bash
pnpm build
```

This creates optimized builds in the `dist/` directory:

- `dist/chatgpt/index.js` - ChatGPT iframe component
  - Host this file somewhere and reference it as a resource in your MCP server.

## Resources

- [sunpeak](https://github.com/Sunpeak-AI/sunpeak)
- [ChatGPT Apps SDK Design Guidelines](https://developers.openai.com/apps-sdk/concepts/design-guidelines)
- [ChatGPT Apps SDK UI Documentation](https://developers.openai.com/apps-sdk/build/chatgpt-ui)
- [ChatGPT Apps SDK Examples](https://github.com/openai/openai-apps-sdk-examples)
- [shadcn/ui](https://ui.shadcn.com/)
