# sunpeak-app

A ChatGPT App UI built with [sunpeak](https://github.com/Sunpeak-AI/sunpeak).

For an initial overview of your new app and a detailed API reference, refer to the [documentation](https://docs.sunpeak.ai/template/project-structure).

## Quickstart

```bash
pnpm install
sunpeak dev
```

That's it! Edit the resource files in [./src/resources/](./src/resources/) to build your resource UI.

## Commands

```bash
# Core commands:
pnpm test              # Run tests with Vitest.
pnpm test:e2e          # Run end-to-end tests with Playwright.
sunpeak dev            # Start development server.
sunpeak build          # Build all resources for production.
sunpeak mcp            # Start MCP server for ChatGPT testing with mock data.

# sunpeak repository (think ECR for ChatGPT Apps):
sunpeak login          # Authenticate with the sunpeak repository.
sunpeak push           # Push built resources to the sunpeak repository.
sunpeak pull           # Pull built resources from the sunpeak repository (for your prod MCP server).
```

The template includes a minimal test setup with Vitest. You can add additional tooling (linting, formatting, type-checking) as needed for your project.

## Project Structure

- `src/resources/` - Directory containing all your MCP Resources (ChatGPT App UIs).
  - Every file in this directory ending with -resource.tsx will be automatically built by the framework to dist/name.js, where the output name will be whatever was prefixed to -resource.tsx.
  - Each resource must have a companion -resource.json file containing metadata (name, title, description, etc.).
- `src/simulations/` - Directory containing simulation JSON files.
  - Files in this directory matching \*-simulation.json are automatically discovered by the dev server and MCP server.
  - Simulations are linked to resources by filename prefix (e.g., albums-show-simulation.json links to albums-resource.tsx).
- `tests/e2e/` - Directory containing end-to-end Playwright tests for each resource. Uses the ChatGPTSimulator to test your resources render properly with any state (tool calls, saved state, dark mode, pip display mode, etc.).

## Testing in ChatGPT

Test your app directly in ChatGPT using the built-in MCP server:

```bash
# Start the MCP server (rebuilds and restarts on file changes).
sunpeak mcp

# In another terminal, run a tunnel. For example:
ngrok http 6766
```

You can then connect to the tunnel forwarding URL at the `/mcp` path from ChatGPT **in developer mode** to see your UI in action: `User > Settings > Apps & Connectors > Create`

Once your app is connected, send the name of the app and a tool, like `/sunpeak show review`, to ChatGPT.

When you make changes to the UI, refresh your app in ChatGPT after the MCP server has finished rebuilding your app: `User > Settings > Apps & Connectors > My App > Refresh`

## Build & Deploy

Build your app for production:

```bash
sunpeak build
```

This creates optimized builds in `dist/`, organized by resource:

```bash
dist/
├── albums/
│   ├── albums.js                     # Built resource component.
│   ├── albums.json                   # Resource metadata.
│   └── albums-show-simulation.json   # Resource mock data for testing.
├── review/
│   ├── review.js
│   ├── review.json
│   ├── review-diff-simulation.json
│   ├── review-post-simulation.json
│   └── review-purchase-simulation.json
└── ...
```

Each resource folder contains:

- **`.js` file**: Self-contained bundle with CSS inlined
- **`.json` file**: Resource metadata with unique `uri` for cache-busting
- **`*-simulation.json` files**: All affiliated simulation files for the resource. These are not needed for the production runtime, but are used in the sunpeak repository for testing.

Host these files and reference them as resources in your production MCP server.
Use the sunpeak resource repository for built-in resource hosting.

## Add a new UI (Resource)

To add a new UI (MCP Resource), simply create the following files:

- `src/resources/NAME-resource.tsx`
- `src/resources/NAME-resource.json`
- `src/simulations/NAME-TOOLNAME-simulation.json`

Only the resource files are required to generate a production build and ship a UI. Create the simulation file if you want to preview your resource in `sunpeak dev` or `sunpeak mcp`.

## Resources

- [sunpeak](https://github.com/Sunpeak-AI/sunpeak)
- [ChatGPT Apps SDK Design Guidelines](https://developers.openai.com/apps-sdk/concepts/design-guidelines)
- [ChatGPT Apps SDK UI Documentation](https://developers.openai.com/apps-sdk/build/chatgpt-ui)
- [ChatGPT Apps SDK Examples](https://github.com/openai/openai-apps-sdk-examples)
