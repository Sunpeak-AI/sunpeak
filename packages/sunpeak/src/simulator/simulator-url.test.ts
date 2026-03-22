import { describe, it, expect } from 'vitest';
import { createSimulatorUrl } from './simulator-url';

describe('createSimulatorUrl', () => {
  it('encodes serverUrl param', () => {
    const url = createSimulatorUrl({ serverUrl: 'http://localhost:8000/mcp' });
    expect(url).toContain('serverUrl=http%3A%2F%2Flocalhost%3A8000%2Fmcp');
  });

  it('encodes tool param', () => {
    const url = createSimulatorUrl({ tool: 'search-products' });
    expect(url).toContain('tool=search-products');
  });

  it('combines serverUrl and tool with other params', () => {
    const url = createSimulatorUrl({
      simulation: 'search-products',
      host: 'chatgpt',
      theme: 'dark',
      serverUrl: 'http://localhost:8000/mcp',
      tool: 'search-products',
    });
    expect(url).toContain('simulation=search-products');
    expect(url).toContain('host=chatgpt');
    expect(url).toContain('theme=dark');
    expect(url).toContain('serverUrl=');
    expect(url).toContain('tool=search-products');
  });

  it('omits serverUrl and tool when undefined', () => {
    const url = createSimulatorUrl({ simulation: 'test' });
    expect(url).not.toContain('serverUrl');
    expect(url).not.toContain('tool=');
  });
});
