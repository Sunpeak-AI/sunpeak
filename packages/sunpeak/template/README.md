# sunpeak-app

An MCP App built with [sunpeak](https://github.com/Sunpeak-AI/sunpeak).

For an initial overview of your new app and a detailed API reference, refer to the [documentation](https://docs.sunpeak.ai/template/project-structure).

## Quickstart

```bash
sunpeak dev
```

That's it! Edit the resource files in [./src/resources/](./src/resources/) to build your resource UI.

## Commands

```bash
# Core commands:
pnpm test              # Run tests with Vitest.
pnpm test:e2e          # Run end-to-end tests with Playwright.
sunpeak dev            # Start dev server + MCP endpoint.
sunpeak build          # Build all resources for production.

# sunpeak repository (think ECR for MCP Apps):
sunpeak login          # Authenticate with the sunpeak repository.
sunpeak push           # Push built resources to the sunpeak repository.
sunpeak pull           # Pull built resources from the sunpeak repository (for your prod MCP server).
```

The template includes a minimal test setup with Vitest. You can add additional tooling (linting, formatting, type-checking) as needed for your project.

## Project Structure

Using a Review page as an example, sunpeak projects look like:

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

## Testing in ChatGPT

Test your app directly in ChatGPT using the built-in MCP endpoint (starts automatically with `sunpeak dev`):

```bash
# Start the dev server + MCP endpoint.
sunpeak dev

# In another terminal, run a tunnel. For example:
ngrok http 6766
```

You can then connect to the tunnel forwarding URL at the `/mcp` path from ChatGPT **in developer mode** to see your UI in action: `User > Settings > Apps & Connectors > Create`

Once your app is connected, send the name of the app and a tool, like `/sunpeak show review`, to ChatGPT.

## Build & Deploy

Build your app for production:

```bash
sunpeak build
```

This creates optimized builds in `dist/`, organized by resource:

```bash
dist/
├── albums/
│   ├── albums.js             # Built resource component.
│   └── albums.json           # Resource metadata.
├── review/
│   ├── review.js
│   └── review.json
└── ...
```

Each resource folder contains:

- **`.js` file**: Self-contained bundle with CSS inlined
- **`.json` file**: Resource metadata with unique `uri` for cache-busting

Host these files and reference them as resources in your production MCP server.
Use the sunpeak resource repository for built-in resource hosting.

## Add a new UI (Resource)

To add a new UI (MCP Resource), create a new directory under `src/resources/` with the following files:

```
src/resources/NAME/
├── NAME-resource.tsx              # React component (required)
├── NAME-resource.json             # Resource metadata (required)
├── NAME-resource.test.tsx         # Unit tests (optional)
└── components/                    # UI components (optional)
```

Only the resource files (`.tsx` and `.json`) are required to generate a production build and ship a UI.

Create the simulation file(s) in `tests/simulations/` if you want to preview your resource in `sunpeak dev`.

## Resources

- [sunpeak](https://github.com/Sunpeak-AI/sunpeak)
- [MCP Apps SDK](https://github.com/anthropics/mcp-apps)
- [ChatGPT Apps SDK Design Guidelines](https://developers.openai.com/apps-sdk/concepts/design-guidelines)
- [ChatGPT Apps SDK UI Documentation](https://developers.openai.com/apps-sdk/build/chatgpt-ui)
- [ChatGPT Apps SDK Examples](https://github.com/openai/openai-apps-sdk-examples)
