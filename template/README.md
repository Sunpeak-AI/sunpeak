# sunpeak-app

A ChatGPT App UI built with [sunpeak](https://github.com/Sunpeak-AI/sunpeak).

For an initial overview of your new app and the sunpeak API, refer to the [documentation](https://docs.sunpeak.ai/template/project-structure).

## Quickstart

```bash
pnpm install
pnpm dev
```

That's it! Edit the resource files in [./src/components/resources/](./src/components/resources/) to build your resource UI.

## Commands

```bash
pnpm dev            # Start development server
pnpm build          # Build all resources for production
pnpm mcp            # Start MCP server with auto-reload
pnpm test           # Run tests with Vitest
```

The template includes a minimal test setup with Vitest. You can add additional tooling (linting, formatting, type-checking) as needed for your project.

### Customization

**You can customize:**

- Package.json scripts - Add your own tooling (lint, format, typecheck, etc.)
- Component structure within `src/components/`
- Package manager (pnpm, npm, or yarn auto-detected)
- Vite dev server configuration

**Do not customize (required by `sunpeak build`):**

- `src/components/resources/` - Resource files must be here
- `src/index-resource.tsx` - Build template (must have `// RESOURCE_IMPORT` and `// RESOURCE_MOUNT` comments)
- `vite.config.build.ts` - Build configuration
- Resource file naming: `*-resource.tsx` (e.g., `counter-resource.tsx`)

If you need to customize these paths, create a custom build script instead of using `sunpeak build`.

## Testing

### Testing Locally

Run the test suite:

```bash
pnpm test
```

For manual QA of the UI:

```bash
sunpeak dev
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

This creates optimized builds in `dist/chatgpt/`:

- `dist/chatgpt/counter.js`
- `dist/chatgpt/albums.js`
- `dist/chatgpt/carousel.js`
- _(One .js file per resource in src/components/resources/)_

Each file is a self-contained bundle with CSS inlined. Host these files and reference them as resources in your production MCP server.

## Resources

- [sunpeak](https://github.com/Sunpeak-AI/sunpeak)
- [ChatGPT Apps SDK Design Guidelines](https://developers.openai.com/apps-sdk/concepts/design-guidelines)
- [ChatGPT Apps SDK UI Documentation](https://developers.openai.com/apps-sdk/build/chatgpt-ui)
- [ChatGPT Apps SDK Examples](https://github.com/openai/openai-apps-sdk-examples)
