/**
 * Drift guard for the built `dist/embed.css`.
 *
 * `sunpeak/embed.css` is the stylesheet embedders import into their own
 * React app. The whole point is that nothing in it should leak onto the
 * host page's global cascade — every declaration that affects elements
 * must be scoped under `.sunpeak-inspector-root`.
 *
 * This test reads the built file and asserts:
 *   1. No remaining `:root, :host` selectors (Tailwind theme tokens — these
 *      are rewritten by `scripts/scope-embed-theme.mjs` after Tailwind emits).
 *   2. No global element selectors at top level (html, body, button, h1-h6,
 *      ol, ul, a, table, etc.) — those would mean preflight bleeds.
 *   3. Every preflight rule is scoped under `.sunpeak-inspector-root`.
 *
 * The test skips when `dist/embed.css` doesn't exist (developer hasn't run
 * `pnpm build` yet). CI always builds before testing.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EMBED_CSS = resolve(__dirname, '..', '..', 'dist', 'embed.css');

describe('embed.css drift guard', () => {
  it.skipIf(!existsSync(EMBED_CSS))(
    'has zero `:root` or `:host` substrings — theme tokens must be scoped',
    () => {
      const css = readFileSync(EMBED_CSS, 'utf8');
      // Paranoid check: assert NO `:root` or `:host` appears anywhere. The
      // rewriter in `scripts/scope-embed-theme.mjs` uses a specific pattern
      // to rewrite Tailwind's `:root, :host` block; if Tailwind ever changes
      // its output shape (e.g. `:where(:root, :host)`, `:host, :root` reversed,
      // or splits into separate blocks), the rewriter could silently miss it.
      // This stronger check fails loudly so we notice immediately.
      //
      // Tailwind v4's `@layer properties` uses `*, :before, :after, ::backdrop`
      // — no `:root` or `:host` mentions there — so 0 is the legitimate target.
      const rootMatches = css.match(/:root/g) ?? [];
      const hostMatches = css.match(/:host/g) ?? [];
      expect(
        rootMatches,
        `Unexpected \`:root\` selectors in embed.css (${rootMatches.length}). The rewriter in scripts/scope-embed-theme.mjs may need updating — Tailwind's theme output format may have changed.`
      ).toEqual([]);
      expect(
        hostMatches,
        `Unexpected \`:host\` selectors in embed.css (${hostMatches.length}).`
      ).toEqual([]);
    }
  );

  it.skipIf(!existsSync(EMBED_CSS))(
    'has no top-level element selectors — preflight must be scoped',
    () => {
      const css = readFileSync(EMBED_CSS, 'utf8');
      // Top-level selectors in minified CSS sit right after a `}` (or at
      // file start). Match common preflight elements followed by ANY selector
      // continuation: `,` `{` `:` (pseudo-class) `[` (attribute selector) or
      // whitespace. Catches `}button,`, `}button{`, `}button:hover{`,
      // `}input[type="…"]`, etc. — any of which would indicate a global
      // preflight leak.
      const TOP_LEVEL_ELEMENT_RE =
        /(\}|^)(html|body|button|input|select|textarea|h[1-6]|p|a|ul|ol|li|table|hr|fieldset|blockquote|dialog|summary|code|pre|kbd|samp|abbr|sub|sup|small|strong|figure|menu|details|legend)[\s:,[{]/g;
      const matches = css.match(TOP_LEVEL_ELEMENT_RE);
      expect(
        matches ?? [],
        `Unexpected global element selectors in embed.css: ${(matches ?? []).join(', ')}`
      ).toEqual([]);
    }
  );

  it.skipIf(!existsSync(EMBED_CSS))(
    'contains the inspector scope class for preflight rules',
    () => {
      const css = readFileSync(EMBED_CSS, 'utf8');
      // The scoped preflight should produce at least a dozen `.sunpeak-inspector-root`
      // occurrences — if this number plummets, something is wrong with the build.
      const occurrences = (css.match(/\.sunpeak-inspector-root/g) ?? []).length;
      expect(occurrences).toBeGreaterThan(20);
    }
  );
});
