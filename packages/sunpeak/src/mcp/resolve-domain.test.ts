import { describe, it, expect } from 'vitest';
import {
  resolveDomain,
  computeClaudeDomain,
  computeChatGPTDomain,
  injectResolvedDomain,
  injectDefaultDomain,
} from './resolve-domain';

describe('resolveDomain', () => {
  it('returns undefined when domain is undefined', () => {
    expect(resolveDomain(undefined, 'claude')).toBeUndefined();
  });

  it('returns the string as-is when domain is a string', () => {
    expect(resolveDomain('example.claudemcpcontent.com', 'claude')).toBe(
      'example.claudemcpcontent.com'
    );
  });

  it('returns the string regardless of clientName', () => {
    expect(resolveDomain('static.example.com', undefined)).toBe('static.example.com');
  });

  it('resolves exact match from map', () => {
    const domain = { claude: 'abc.claudemcpcontent.com', chatgpt: 'xyz.oaiusercontent.com' };
    expect(resolveDomain(domain, 'claude')).toBe('abc.claudemcpcontent.com');
    expect(resolveDomain(domain, 'chatgpt')).toBe('xyz.oaiusercontent.com');
  });

  it('falls back to default when clientName does not match', () => {
    const domain = { claude: 'abc.claudemcpcontent.com', default: 'fallback.example.com' };
    expect(resolveDomain(domain, 'gemini')).toBe('fallback.example.com');
  });

  it('falls back to default when clientName is undefined', () => {
    const domain = { claude: 'abc.claudemcpcontent.com', default: 'fallback.example.com' };
    expect(resolveDomain(domain, undefined)).toBe('fallback.example.com');
  });

  it('returns undefined when no match and no default', () => {
    const domain = { claude: 'abc.claudemcpcontent.com' };
    expect(resolveDomain(domain, 'gemini')).toBeUndefined();
  });

  it('supports arbitrary host names', () => {
    const domain = {
      'chatgpt-macos': 'macos.oaiusercontent.com',
      'custom-host': 'custom.example.com',
    };
    expect(resolveDomain(domain, 'chatgpt-macos')).toBe('macos.oaiusercontent.com');
    expect(resolveDomain(domain, 'custom-host')).toBe('custom.example.com');
  });
});

describe('computeClaudeDomain', () => {
  it('returns a 32-char hex hash subdomain of claudemcpcontent.com', () => {
    const result = computeClaudeDomain('https://example.com/mcp');
    expect(result).toMatch(/^[0-9a-f]{32}\.claudemcpcontent\.com$/);
  });

  it('produces deterministic output', () => {
    const a = computeClaudeDomain('https://example.com/mcp');
    const b = computeClaudeDomain('https://example.com/mcp');
    expect(a).toBe(b);
  });

  it('produces different output for different URLs', () => {
    const a = computeClaudeDomain('https://example.com/mcp');
    const b = computeClaudeDomain('https://other.com/mcp');
    expect(a).not.toBe(b);
  });
});

describe('computeChatGPTDomain', () => {
  it('returns a slug subdomain of oaiusercontent.com', () => {
    const result = computeChatGPTDomain('https://www.example.com/mcp');
    expect(result).toBe('www-example-com.oaiusercontent.com');
  });

  it('strips non-alphanumeric characters', () => {
    const result = computeChatGPTDomain('https://my.app.example.com');
    expect(result).toBe('my-app-example-com.oaiusercontent.com');
  });

  it('handles malformed URLs gracefully', () => {
    const result = computeChatGPTDomain('not-a-url');
    expect(result).toBe('not-a-url.oaiusercontent.com');
  });
});

describe('injectResolvedDomain', () => {
  it('returns undefined meta unchanged', () => {
    expect(injectResolvedDomain(undefined, 'claude')).toBeUndefined();
  });

  it('returns meta without ui unchanged', () => {
    const meta = { other: 'value' };
    expect(injectResolvedDomain(meta, 'claude')).toBe(meta);
  });

  it('returns meta with string domain unchanged', () => {
    const meta = { ui: { domain: 'static.example.com', csp: {} } };
    expect(injectResolvedDomain(meta, 'claude')).toBe(meta);
  });

  it('returns meta with no domain unchanged', () => {
    const meta = { ui: { csp: { connectDomains: ['https://api.example.com'] } } };
    expect(injectResolvedDomain(meta, 'claude')).toBe(meta);
  });

  it('resolves domain map and preserves other ui fields', () => {
    const meta = {
      ui: {
        domain: { claude: 'abc.claudemcpcontent.com', chatgpt: 'xyz.oaiusercontent.com' },
        csp: { connectDomains: ['https://api.example.com'] },
        prefersBorder: true,
      },
    };
    const result = injectResolvedDomain(meta, 'claude');
    expect(result).toEqual({
      ui: {
        domain: 'abc.claudemcpcontent.com',
        csp: { connectDomains: ['https://api.example.com'] },
        prefersBorder: true,
      },
    });
  });

  it('omits domain from result when no match and no default', () => {
    const meta = {
      ui: {
        domain: { claude: 'abc.claudemcpcontent.com' },
        csp: {},
      },
    };
    const result = injectResolvedDomain(meta, 'gemini');
    expect(result).toEqual({ ui: { csp: {} } });
  });

  it('uses default fallback for unmatched host', () => {
    const meta = {
      ui: {
        domain: { claude: 'abc.claudemcpcontent.com', default: 'fallback.example.com' },
      },
    };
    const result = injectResolvedDomain(meta, 'gemini');
    expect(result).toEqual({ ui: { domain: 'fallback.example.com' } });
  });
});

describe('injectDefaultDomain', () => {
  const serverUrl = 'http://localhost:8000';

  it('returns meta unchanged when domain is already set', () => {
    const meta = { ui: { domain: 'existing.example.com', csp: {} } };
    expect(injectDefaultDomain(meta, 'chatgpt-macos', serverUrl)).toBe(meta);
  });

  it('computes ChatGPT domain for openai-mcp client', () => {
    const meta = { ui: { csp: { connectDomains: ['https://api.example.com'] } } };
    const result = injectDefaultDomain(meta, 'openai-mcp', serverUrl);
    expect(result).toEqual({
      ui: {
        csp: { connectDomains: ['https://api.example.com'] },
        domain: 'localhost.oaiusercontent.com',
      },
    });
  });

  it('computes ChatGPT domain for chatgpt-macos client', () => {
    const meta = { ui: { csp: {} } };
    const result = injectDefaultDomain(meta, 'chatgpt-macos', serverUrl);
    expect((result.ui as Record<string, unknown>).domain).toBe('localhost.oaiusercontent.com');
  });

  it('computes Claude domain for claude client', () => {
    const meta = { ui: { csp: {} } };
    const result = injectDefaultDomain(meta, 'claude', serverUrl);
    expect((result.ui as Record<string, unknown>).domain).toMatch(
      /^[0-9a-f]{32}\.claudemcpcontent\.com$/
    );
  });

  it('returns meta unchanged for unknown host', () => {
    const meta = { ui: { csp: {} } };
    const result = injectDefaultDomain(meta, 'gemini', serverUrl);
    expect(result).toEqual({ ui: { csp: {} } });
  });

  it('returns empty meta when input is undefined and host is unknown', () => {
    expect(injectDefaultDomain(undefined, 'gemini', serverUrl)).toEqual({});
  });

  it('creates meta with domain when input is undefined and host is known', () => {
    const result = injectDefaultDomain(undefined, 'openai-mcp', serverUrl);
    expect(result).toEqual({ ui: { domain: 'localhost.oaiusercontent.com' } });
  });

  it('preserves other ui fields', () => {
    const meta = { ui: { prefersBorder: false, csp: {} } };
    const result = injectDefaultDomain(meta, 'openai-mcp', serverUrl);
    expect(result).toEqual({
      ui: { prefersBorder: false, csp: {}, domain: 'localhost.oaiusercontent.com' },
    });
  });
});
