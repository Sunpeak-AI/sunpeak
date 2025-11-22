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

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm dev
```

Ensure the following scripts work/pass in `template`:

```bash
cd template
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm dev
```

Confirm that there is a single built `./dist/chatgpt/index.js` file.

## Deployment

On pushes to `main`, Github Actions automatically increments the version number and creates the git tag.

To deploy to npm, create a release in Github and Github Actions will automatically deploy to npm.

### Deployment Testing

Assuming `pwd` is this root sunpeak repo folder, run:

```bash
rm -rf ../tmp && mkdir ../tmp && cd ../tmp
pnpm dlx sunpeak init my-app && cd my-app
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm dev
```

## Coding Guidance

### Documentation

Only comment and add documentation if the added context or explanation significantly enhances understanding beyond a quick look at the source material itself.

Avoid updating the root README except to correct things that have changed or add context on a major new feature.

### The most important rule

Have fun.
