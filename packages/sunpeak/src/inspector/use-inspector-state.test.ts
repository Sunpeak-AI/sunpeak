import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useInspectorState } from './use-inspector-state';
import type { Simulation } from '../types/simulation';

function createSim(name: string, hasResource: boolean): Simulation {
  return {
    name,
    tool: { name, inputSchema: { type: 'object' } },
    resource: hasResource
      ? { uri: `test://${name}`, name: `${name}-resource`, mimeType: 'text/html' }
      : undefined,
    resourceUrl: hasResource ? `/${name}.html` : undefined,
  };
}

describe('useInspectorState', () => {
  it('filters out backend-only simulations', () => {
    const simulations = {
      'ui-tool': createSim('ui-tool', true),
      'backend-tool': createSim('backend-tool', false),
    };

    const { result } = renderHook(() => useInspectorState({ simulations }));

    expect(result.current.simulationNames).toContain('ui-tool');
    expect(result.current.simulationNames).not.toContain('backend-tool');
  });
});
