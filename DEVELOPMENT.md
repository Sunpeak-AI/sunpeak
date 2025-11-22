# Development Guide

## Quickstart

Requirements: Node (20+), pnpm (10+), git

```bash
git clone https://github.com/Sunpeak-AI/sunpeak.git
cd sunpeak && pnpm install
pnpm dev
```

## Testing

Ensure the following scripts work/pass:
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm dev`
- `pnpm build`
- `./sunpeak.js init my-app && cd my-app`

Ensure the following scripts work/pass in `my-app`:
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm dev`
- `pnpm build`

## Deployment

On pushes to `main`, Github Actions automatically increments the version number and creates the git tag.

To deploy to npm, create a release in Github and Github Actions will automatically deploy to npm.
