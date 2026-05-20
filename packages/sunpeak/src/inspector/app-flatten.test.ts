import { describe, expect, it, vi } from 'vitest';
import { flattenAppToSimulations } from './app-flatten';
import type { InspectorApp } from './app-types';

function makeTool(name: string, outputTemplate?: string) {
  return {
    name,
    inputSchema: { type: 'object' as const, properties: {}, required: [] },
    ...(outputTemplate ? { _meta: { openai: { outputTemplate } } } : {}),
  };
}

describe('flattenAppToSimulations', () => {
  it('returns an empty map when no app is provided', () => {
    expect(flattenAppToSimulations(undefined)).toEqual({});
  });

  it('emits one Simulation per (tool, simulation) pair, scoped by tool name', () => {
    const app: InspectorApp = {
      resources: [{ uri: 'ui://albums', html: '<html>albums</html>' }],
      tools: [
        {
          tool: makeTool('show_albums', 'ui://albums'),
          simulations: [
            { name: 'two-albums', toolInput: { count: 2 } },
            { name: 'no-albums', toolInput: { count: 0 } },
          ],
        },
      ],
    };
    const flat = flattenAppToSimulations(app);
    expect(Object.keys(flat).sort()).toEqual(['show_albums__no-albums', 'show_albums__two-albums']);
    expect(flat['show_albums__two-albums'].resourceHtml).toBe('<html>albums</html>');
    expect(flat['show_albums__two-albums'].tool.name).toBe('show_albums');
    expect(flat['show_albums__two-albums'].toolInput).toEqual({ count: 2 });
  });

  it('emits one fixture-less Simulation when a tool has no simulations', () => {
    const app: InspectorApp = {
      resources: [{ uri: 'ui://albums', html: '<h1>x</h1>' }],
      tools: [{ tool: makeTool('show_albums', 'ui://albums') }],
    };
    const flat = flattenAppToSimulations(app);
    expect(Object.keys(flat)).toEqual(['show_albums__show_albums']);
    expect(flat['show_albums__show_albums'].toolInput).toBeUndefined();
    expect(flat['show_albums__show_albums'].toolResult).toBeUndefined();
  });

  it('shares a resource across multiple tools via outputTemplate URI', () => {
    const app: InspectorApp = {
      resources: [{ uri: 'ui://albums', html: '<h1>shared</h1>' }],
      tools: [
        { tool: makeTool('show_albums', 'ui://albums') },
        { tool: makeTool('search_albums', 'ui://albums') },
      ],
    };
    const flat = flattenAppToSimulations(app);
    expect(Object.keys(flat).sort()).toEqual([
      'search_albums__search_albums',
      'show_albums__show_albums',
    ]);
    expect(flat['search_albums__search_albums'].resourceHtml).toBe('<h1>shared</h1>');
    expect(flat['show_albums__show_albums'].resourceHtml).toBe('<h1>shared</h1>');
  });

  it('skips tools whose outputTemplate references an unknown resource', () => {
    const app: InspectorApp = {
      resources: [{ uri: 'ui://albums', html: '<h1>x</h1>' }],
      tools: [
        { tool: makeTool('show_albums', 'ui://albums') },
        { tool: makeTool('orphan', 'ui://missing') },
      ],
    };
    const flat = flattenAppToSimulations(app);
    expect(Object.keys(flat)).toEqual(['show_albums__show_albums']);
  });

  it('skips tools with no outputTemplate', () => {
    const app: InspectorApp = {
      resources: [{ uri: 'ui://albums', html: '<h1>x</h1>' }],
      tools: [{ tool: makeTool('headless_tool') }],
    };
    const flat = flattenAppToSimulations(app);
    expect(flat).toEqual({});
  });

  it('warns when a tool has duplicate simulation names', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      flattenAppToSimulations({
        resources: [{ uri: 'ui://x', html: '<p>x</p>' }],
        tools: [
          {
            tool: makeTool('t', 'ui://x'),
            simulations: [
              { name: 'dup', toolInput: { a: 1 } },
              { name: 'dup', toolInput: { a: 2 } },
            ],
          },
        ],
      });
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Duplicate simulation name 'dup' under tool 't'")
      );
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('warns when app.resources has duplicate URIs', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      flattenAppToSimulations({
        resources: [
          { uri: 'ui://albums', html: '<h1>first</h1>' },
          { uri: 'ui://albums', html: '<h1>second</h1>' },
        ],
        tools: [],
      });
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Duplicate resource URI 'ui://albums'")
      );
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('carries simulation userMessage and serverTools through to the flat entry', () => {
    const app: InspectorApp = {
      resources: [{ uri: 'ui://albums', html: '<h1>x</h1>' }],
      tools: [
        {
          tool: makeTool('show_albums', 'ui://albums'),
          simulations: [
            {
              name: 'sample',
              userMessage: 'show me albums',
              serverTools: { search: { content: [{ type: 'text', text: 'ok' }] } },
            },
          ],
        },
      ],
    };
    const flat = flattenAppToSimulations(app);
    const sim = flat['show_albums__sample'];
    expect(sim.userMessage).toBe('show me albums');
    expect(sim.serverTools).toBeDefined();
  });
});
