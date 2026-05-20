#!/usr/bin/env node
/**
 * Post-process `dist/embed.css` so Tailwind's theme tokens are scoped to the
 * Inspector subtree instead of leaking onto the host page's `:root`.
 *
 * Why: Tailwind v4 emits theme tokens (`--font-sans`, `--color-*`, etc.) into
 * a single `:root, :host` selector by design. When an embedder imports
 * `sunpeak/embed.css`, those declarations land on their host page's `:root`
 * and shadow whatever the embedder defined for the same variable names.
 *
 * Why this is safe: Tailwind utilities like `font-sans` produce
 * `font-family: var(--font-sans)` — they read the variable from the CSS
 * cascade. Every inspector element has `.sunpeak-inspector-root` as an
 * ancestor, so the scoped tokens resolve identically. Outside the inspector,
 * the tokens are undefined → the host's own variables stay intact.
 *
 * What we do NOT rewrite:
 *  - `*, :before, :after, ::backdrop` in `@layer properties` — these declare
 *    Tailwind's `--tw-*` utility internals (used by transform, ring, etc.).
 *    They're name-prefixed and don't collide with anything an embedder would
 *    define. Leaving them global avoids breaking inspector-internal utilities.
 *
 * The drift guard in `src/inspector/embed-css-output.test.ts` verifies the
 * resulting CSS has no remaining `:root, :host` declarations.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CSS_PATH = resolve(__dirname, '..', 'dist', 'embed.css');

if (!existsSync(CSS_PATH)) {
  console.error(`[scope-embed-theme] ${CSS_PATH} not found — run vite build first.`);
  process.exit(1);
}

const input = readFileSync(CSS_PATH, 'utf8');

// Match `:root, :host` (and the unspaced minified `:root,:host`) only when
// followed by `{` — the start of a declaration block. Don't match instances
// inside selector lists or comments.
const ROOT_HOST_RE = /:root\s*,\s*:host\s*\{/g;
const matches = input.match(ROOT_HOST_RE);

if (!matches || matches.length === 0) {
  console.warn(
    '[scope-embed-theme] No `:root, :host` declarations found — Tailwind output may have changed. Skipping rewrite.'
  );
  process.exit(0);
}

const output = input.replace(ROOT_HOST_RE, '.sunpeak-inspector-root{');

writeFileSync(CSS_PATH, output, 'utf8');
console.log(
  `[scope-embed-theme] Rewrote ${matches.length} \`:root, :host\` declaration(s) to \`.sunpeak-inspector-root\` in ${CSS_PATH}`
);
