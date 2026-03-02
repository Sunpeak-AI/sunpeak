# sunpeak-app

An MCP App built with [sunpeak](https://github.com/Sunpeak-AI/sunpeak).

For an initial overview of your new app and a detailed API reference, refer to the [documentation](https://sunpeak.ai/docs/template/project-scaffold).

## Quickstart

```bash
sunpeak dev
```

That's it! Edit the resource files in [./src/resources/](./src/resources/) to build your resource UI.

## Commands

```bash
pnpm test              # Run tests with Vitest.
pnpm test:e2e          # Run end-to-end tests with Playwright.
sunpeak dev            # Start dev server + MCP endpoint.
sunpeak build          # Build all resources for production.
sunpeak upgrade        # Upgrade sunpeak to latest version.
```

The template includes a minimal test setup with Vitest. You can add additional tooling (linting, formatting, type-checking) as needed for your project.

## Project Structure

Using a Review page as an example, sunpeak projects look like:

```bash
my-app/
├── src/resources/
│   └── review/
│       └── review.tsx            # Review UI component + resource metadata.
├── src/tools/
│   ├── review-diff.ts            # Tool: metadata, schema, handler.
│   ├── review-post.ts
│   └── review-purchase.ts
├── tests/simulations/
│   ├── review-diff.json          # Mock state for testing.
│   ├── review-post.json
│   └── review-purchase.json
└── package.json
```

## Testing in ChatGPT

Test your app directly in ChatGPT using the built-in MCP endpoint (starts automatically with `sunpeak dev`):

```bash
# Start the dev server + MCP endpoint.
sunpeak dev

# In another terminal, run a tunnel. For example:
ngrok http 8000
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
│   ├── albums.html           # Built resource bundle.
│   └── albums.json           # ResourceConfig (extracted from .tsx).
├── review/
│   ├── review.html
│   └── review.json
└── ...
```

Each resource folder contains:

- **`.html` file**: Self-contained bundle with JS and CSS inlined
- **`.json` file**: Resource metadata (extracted from the `resource` export in your `.tsx` file) with a generated `uri` for cache-busting

Host these files and reference them as resources in your production MCP server.

## Add a new UI (Resource)

To add a new UI (MCP Resource), create a new directory under `src/resources/` with the following files:

```
src/resources/NAME/
├── NAME.tsx                      # React component + resource metadata (required)
├── NAME.test.tsx                 # Unit tests (optional)
└── components/                   # UI components (optional)
```

Only the resource file (`.tsx`) is required to generate a production build and ship a UI. It must export a `resource` object (`ResourceConfig`) describing the resource metadata, and a React component that renders the UI. The resource name is auto-derived from the directory name.

Then create a tool file in `src/tools/` and simulation file(s) in `tests/simulations/` to preview your resource in `sunpeak dev`.

## Coding Agent Skill

Install the `create-sunpeak-app` skill to give your coding agent built-in knowledge of sunpeak patterns, hooks, simulation files, and testing conventions:

```bash
npx skills add Sunpeak-AI/sunpeak@create-sunpeak-app
```

## Resources

- [sunpeak](https://github.com/Sunpeak-AI/sunpeak)
- [MCP Apps Documentation](https://sunpeak.ai/docs/mcp-apps/introduction)
- [MCP Apps SDK](https://github.com/modelcontextprotocol/ext-apps)
- [ChatGPT Apps SDK Design Guidelines](https://developers.openai.com/apps-sdk/concepts/design-guidelines)
