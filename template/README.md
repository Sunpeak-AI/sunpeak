# sunpeak-app

A ChatGPT App UI built with [sunpeak](https://github.com/Sunpeak-AI/sunpeak).

For an initial overview of your new app and the sunpeak API, refer to the [documentation](https://docs.sunpeak.ai/template/project-structure).

## Quickstart

```bash
pnpm dev
```

Edit the resource files in [./src/components/resources/](./src/components/resources/) to build your resource UI.

## Development

## Testing

### Testing Locally

Run all the checks with the following:

```bash
pnpm validate
```

This will:
- Run linting, typechecking, and unit tests
- Build your app
- Verify that build outputs are created correctly

For manual QA of the UI, run:

```bash
pnpm dev
```

### Testing in ChatGPT

Test your app directly in ChatGPT using the built-in MCP server:

```bash
# Start the MCP server (rebuilds and restarts on file changes).
pnpm mcp

# In another terminal, run a tunnel. For example:
ngrok http 6766
```

You can then connect to the tunnel forwarding URL at the `/mcp` path from ChatGPT **in developer mode** to see your UI in action: `User > Settings > Apps & Connectors > Create`

Once your app is connected, send the name of a tool, like `show counter`, to ChatGPT.

When you make changes to the UI, refresh your app in ChatGPT after the MCP server has finished rebuilding your app: `User > Settings > Apps & Connectors > My App > Refresh`

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
