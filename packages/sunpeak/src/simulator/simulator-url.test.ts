import { describe, it, expect } from 'vitest';
import { createSimulatorUrl } from './simulator-url';

describe('createSimulatorUrl', () => {
  it('encodes tool param', () => {
    const url = createSimulatorUrl({ tool: 'search-products' });
    expect(url).toContain('tool=search-products');
  });

  it('encodes simulation param', () => {
    const url = createSimulatorUrl({ simulation: 'search-products' });
    expect(url).toContain('simulation=search-products');
  });

  it('combines tool and simulation with other params', () => {
    const url = createSimulatorUrl({
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
    const url = createSimulatorUrl({ theme: 'dark' });
    expect(url).not.toContain('tool=');
    expect(url).not.toContain('simulation=');
  });
});
