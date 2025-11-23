# sunpeak-app

A ChatGPT App UI built with [sunpeak](https://github.com/Sunpeak-AI/sunpeak).

## Quickstart

```bash
pnpm dev
```

Edit [src/App.tsx](./src/App.tsx) to build your app UI.

## Development

### Initial Project Structure

```
src/
├── App.tsx          # Your main app component
└── components/      # Your React components

mcp/
└── server.ts        # MCP server for testing in ChatGPT

dist/                # Build output (generated)
└── chatgpt/         # ChatGPT builds
```

## Testing

### Testing Locally

Run the following scripts, and manually QA the UI from the dev server:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm dev
```

### Testing in ChatGPT

Test your app directly in ChatGPT using the built-in MCP server:

```bash
# 1. Build your app. You must rebuild your app for changes to take effect.
pnpm build

# 2. Start the MCP server.
pnpm mcp

# 3. In another terminal, run a tunnel. For example:
ngrok http 6766
```

You can then connect to the tunnel forwarding URL at the `/mcp` path from ChatGPT **in developer mode** to see your UI in action: `User > Settings > Apps & Connectors > Create`

Once your app is connected, send `show app` to ChatGPT. Many changes require you to Refresh your app on the same settings modal.

## Build & Deploy

Build your app for production:

```bash
pnpm build
```

This creates optimized builds in the `dist/` directory:

- `dist/chatgpt/index.js` - ChatGPT iframe component
  - Host this file somewhere and reference it as a resource in your production MCP server.

## Resources

- [sunpeak](https://github.com/Sunpeak-AI/sunpeak)
- [ChatGPT Apps SDK Design Guidelines](https://developers.openai.com/apps-sdk/concepts/design-guidelines)
- [ChatGPT Apps SDK UI Documentation](https://developers.openai.com/apps-sdk/build/chatgpt-ui)
- [ChatGPT Apps SDK Examples](https://github.com/openai/openai-apps-sdk-examples)
