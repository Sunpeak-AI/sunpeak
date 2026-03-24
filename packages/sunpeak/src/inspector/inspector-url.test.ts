import { describe, it, expect } from 'vitest';
import { createInspectorUrl } from './inspector-url';

describe('createInspectorUrl', () => {
  it('encodes tool param', () => {
    const url = createInspectorUrl({ tool: 'search-products' });
    expect(url).toContain('tool=search-products');
  });

  it('encodes simulation param', () => {
    const url = createInspectorUrl({ simulation: 'search-products' });
    expect(url).toContain('simulation=search-products');
  });

  it('combines tool and simulation with other params', () => {
    const url = createInspectorUrl({
      simulation: 'search-products',
      host: 'chatgpt',
      theme: 'dark',
      tool: 'search-products',
    });
    expect(url).toContain('simulation=search-products');
    expect(url).toContain('host=chatgpt');
    expect(url).toContain('theme=dark');
    expect(url).toContain('tool=search-products');
  });

  it('omits tool and simulation when undefined', () => {
    const url = createInspectorUrl({ theme: 'dark' });
    expect(url).not.toContain('tool=');
    expect(url).not.toContain('simulation=');
  });
});
