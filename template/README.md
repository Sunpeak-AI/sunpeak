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
sunpeak dev            # Start dev server + MCP endpoint.
sunpeak build          # Build all resources for production.

# sunpeak repository (think ECR for ChatGPT Apps):
sunpeak login          # Authenticate with the sunpeak repository.
sunpeak push           # Push built resources to the sunpeak repository.
sunpeak pull           # Pull built resources from the sunpeak repository (for your prod MCP server).
```

The template includes a minimal test setup with Vitest. You can add additional tooling (linting, formatting, type-checking) as needed for your project.

## Project Structure

- `src/resources/` - Directory containing all your MCP Resources (ChatGPT App UIs).
  - Each resource is a subdirectory containing all files for that resource.
  - Example: `src/resources/albums/` contains:
    - `albums-resource.tsx` - The React component.
    - `albums-resource.json` - Resource metadata (name, title, description, etc.).
    - `albums-resource.test.tsx` - Unit tests for the resource.
    - `albums-show-simulation.json` - Simulation data for testing.
    - `components/` - UI components used by the resource.
- `tests/e2e/` - Directory containing end-to-end Playwright tests for each resource. Uses the ChatGPTSimulator to test your resources render properly with any state (tool calls, saved state, dark mode, pip display mode, etc.).

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

When you make changes to the UI, refresh your app in ChatGPT after the dev server has finished rebuilding: `User > Settings > Apps & Connectors > My App > Refresh`

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

To add a new UI (MCP Resource), create a new directory under `src/resources/` with the following files:

```
src/resources/NAME/
├── NAME-resource.tsx              # React component (required)
├── NAME-resource.json             # Resource metadata (required)
├── NAME-resource.test.tsx         # Unit tests (optional)
├── NAME-SCENARIO-simulation.json  # Simulation data (optional)
└── components/                    # UI components (optional)
```

Only the resource files (`.tsx` and `.json`) are required to generate a production build and ship a UI. Create the simulation file if you want to preview your resource in `sunpeak dev`.

## Resources

- [sunpeak](https://github.com/Sunpeak-AI/sunpeak)
- [ChatGPT Apps SDK Design Guidelines](https://developers.openai.com/apps-sdk/concepts/design-guidelines)
- [ChatGPT Apps SDK UI Documentation](https://developers.openai.com/apps-sdk/build/chatgpt-ui)
- [ChatGPT Apps SDK Examples](https://github.com/openai/openai-apps-sdk-examples)
