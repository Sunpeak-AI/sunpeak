/**
 * Unit tests for `injectInfraScripts` — the helper that splices the
 * paint-fence responder and the platform runtime into resource HTML before
 * the Inspector hands it to the sandbox proxy. Exercises the three placement
 * branches (head, body, no-tag) plus tag-case tolerance.
 */
import { describe, it, expect } from 'vitest';
import { injectInfraScripts } from './iframe-resource';

const FENCE_MARKER = 'data-sunpeak-fence';

describe('injectInfraScripts', () => {
  it('injects before </head> when a head closing tag is present', () => {
    const html = '<!DOCTYPE html><html><head><title>x</title></head><body></body></html>';
    const out = injectInfraScripts(html);
    expect(out).toContain(FENCE_MARKER);
    expect(out.indexOf(FENCE_MARKER)).toBeLessThan(out.indexOf('</head>'));
  });

  it('falls back to after <body> when there is no </head>', () => {
    const html = '<!DOCTYPE html><html><body><p>hi</p></body></html>';
    const out = injectInfraScripts(html);
    const fenceAt = out.indexOf(FENCE_MARKER);
    const bodyAt = out.indexOf('<body>');
    expect(fenceAt).toBeGreaterThan(bodyAt);
  });

  it('prepends the injection when neither </head> nor <body> exists', () => {
    const html = '<p>just a fragment</p>';
    const out = injectInfraScripts(html);
    expect(out.startsWith('<script')).toBe(true);
    expect(out.endsWith('<p>just a fragment</p>')).toBe(true);
  });

  it('only adds a platform script tag when one is supplied', () => {
    const withoutPlatform = injectInfraScripts('<html><head></head></html>');
    expect(withoutPlatform).not.toContain('PLATFORM_MARKER');

    const withPlatform = injectInfraScripts(
      '<html><head></head></html>',
      'window.PLATFORM_MARKER = true;'
    );
    expect(withPlatform).toContain('PLATFORM_MARKER');
    // platform script must run BEFORE the fence responder so platform globals
    // are visible to the app from first render.
    expect(withPlatform.indexOf('PLATFORM_MARKER')).toBeLessThan(
      withPlatform.indexOf(FENCE_MARKER)
    );
  });

  it('matches uppercase / mixed-case </HEAD>', () => {
    const html = '<HTML><HEAD></HEAD><BODY></BODY></HTML>';
    const out = injectInfraScripts(html);
    expect(out).toContain(FENCE_MARKER);
    expect(out.indexOf(FENCE_MARKER)).toBeLessThan(out.indexOf('</HEAD>'));
  });

  it('injects the inline SDK helper alongside the paint fence', () => {
    const out = injectInfraScripts('<html><head></head></html>');
    expect(out).toContain('data-sunpeak-helper');
    expect(out).toContain('window.sunpeak');
    expect(out).toContain('ui/initialize');
  });

  it('exposes the full helper callback surface (input/partial/result/cancelled/host-context)', () => {
    const out = injectInfraScripts('<html><head></head></html>');
    expect(out).toContain('onToolInput');
    expect(out).toContain('onToolInputPartial');
    expect(out).toContain('onToolResult');
    expect(out).toContain('onToolCancelled');
    expect(out).toContain('onHostContextChange');
  });

  it('honors the <meta name="sunpeak-helper" content="off"> opt-out at runtime', () => {
    // The opt-out is a runtime check inside the script body. We verify the
    // body contains the meta-name query and an `off` comparison; the
    // case-insensitive behavior and runtime dispatch are exercised by
    // inline-helper-runtime.test.ts.
    const out = injectInfraScripts('<html><head></head></html>');
    expect(out).toMatch(/meta\[name="sunpeak-helper"\]/);
    expect(out).toMatch(/'off'/);
  });

  it('preserves <body> attributes when injecting via the body fallback', () => {
    const html = '<html><body class="dark" data-x="y"><p>hi</p></body></html>';
    const out = injectInfraScripts(html);
    expect(out).toContain('<body class="dark" data-x="y">');
    expect(out.indexOf(FENCE_MARKER)).toBeGreaterThan(
      out.indexOf('<body class="dark" data-x="y">')
    );
  });
});
