# Development Guide

Refer to the [documentation](https://docs.sunpeak.ai/) to ramp up on sunpeak.

## Quickstart

Requirements: Node (20+), pnpm (10+), git

```bash
git clone https://github.com/Sunpeak-AI/sunpeak.git
cd sunpeak && pnpm install
pnpm dev
```

## Local Testing

Run all the checks with the following:

```bash
pnpm validate
```

This will:

- Run linting, typechecking, and unit tests at the root and template levels
- Build both packages
- Start the dev server and run E2E tests with Playwright

For manual testing with live servers, you can also run:

- `pnpm dev`
- `pnpm mcp` (in template directory)

### ChatGPT Prod - Local Package

With the mcp server still running from the previous step, make sure to have a tunnel like ngrok running in another terminal using the mcp port:

```
ngrok http 6766
```

You can then connect to the tunnel forwarding URL at the `/mcp` path from ChatGPT **in developer mode** to see the template UI in action: `User > Settings > Apps & Connectors > Create`

Once the app is connected, send `show app` to ChatGPT. Many changes require you to Refresh the app on the same settings modal.

## Deployment

On pushes to `main`, Github Actions automatically increments the version number and creates the git tag.

To deploy to npm, create a release in Github and Github Actions will automatically deploy to npm.

### Deployment Testing

Assuming `pwd` is this root sunpeak repo folder, run:

```bash
rm -rf ../tmp && mkdir ../tmp && cd ../tmp
pnpm dlx sunpeak new my-app && cd my-app
pnpm validate
```

## Coding Guidance

### Documentation

Only comment and add documentation if the added context or explanation significantly enhances understanding beyond a quick look at the source material itself.

Avoid updating the root README except to correct things that have changed or add context on a major new feature.

### The most important rule

Have fun.
