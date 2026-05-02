import { renderHook } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
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

const PREFS_KEY = 'sunpeak-inspector-prefs';

describe('useInspectorState', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState({}, '', '/');
  });

  it('filters out backend-only simulations', () => {
    const simulations = {
      'ui-tool': createSim('ui-tool', true),
      'backend-tool': createSim('backend-tool', false),
    };

    const { result } = renderHook(() => useInspectorState({ simulations }));

    expect(result.current.simulationNames).toContain('ui-tool');
    expect(result.current.simulationNames).not.toContain('backend-tool');
  });

  describe('preference persistence', () => {
    const simulations = { 'ui-tool': createSim('ui-tool', true) };

    it('restores valid stored preferences', () => {
      localStorage.setItem(
        PREFS_KEY,
        JSON.stringify({
          theme: 'light',
          locale: 'ja-JP',
          activeHost: 'claude',
          containerMaxHeight: 600,
          containerMaxWidth: 800,
          screenWidth: 'tablet',
        })
      );

      const { result } = renderHook(() => useInspectorState({ simulations }));

      expect(result.current.theme).toBe('light');
      expect(result.current.locale).toBe('ja-JP');
      expect(result.current.activeHost).toBe('claude');
      expect(result.current.containerMaxHeight).toBe(600);
      expect(result.current.containerMaxWidth).toBe(800);
      expect(result.current.screenWidth).toBe('tablet');
    });

    it('ignores invalid values in stored preferences', () => {
      localStorage.setItem(
        PREFS_KEY,
        JSON.stringify({
          theme: 'neon-pink',
          displayMode: 'magic',
          platform: 'console',
          screenWidth: 'enormous',
          containerMaxHeight: 'tall',
          hover: 'yes',
          safeAreaInsets: { top: 10 },
        })
      );

      const { result } = renderHook(() => useInspectorState({ simulations }));

      // Bad values are dropped; defaults are used.
      expect(result.current.theme).toBe('dark');
      expect(result.current.displayMode).toBe('inline');
      expect(result.current.platform).toBe('desktop');
      expect(result.current.screenWidth).toBe('full');
      expect(result.current.containerMaxHeight).toBeUndefined();
      expect(result.current.hover).toBe(true);
      expect(result.current.safeAreaInsets).toEqual({ top: 0, bottom: 0, left: 0, right: 0 });
    });

    it('falls back to defaults when stored JSON is corrupt', () => {
      localStorage.setItem(PREFS_KEY, 'not-json{');

      const { result } = renderHook(() => useInspectorState({ simulations }));

      expect(result.current.theme).toBe('dark');
      expect(result.current.activeHost).toBe('chatgpt');
    });

    it('skips persistence when autoRun=true (test fixture mode)', () => {
      window.history.replaceState({}, '', '/?autoRun=true');
      localStorage.setItem(PREFS_KEY, JSON.stringify({ theme: 'light', activeHost: 'claude' }));

      const { result } = renderHook(() => useInspectorState({ simulations }));

      // autoRun mode ignores storage entirely.
      expect(result.current.theme).toBe('dark');
      expect(result.current.activeHost).toBe('chatgpt');
    });

    it('URL params take precedence over stored preferences', () => {
      window.history.replaceState({}, '', '/?theme=light&host=claude');
      localStorage.setItem(
        PREFS_KEY,
        JSON.stringify({ theme: 'dark', activeHost: 'chatgpt', locale: 'fr-FR' })
      );

      const { result } = renderHook(() => useInspectorState({ simulations }));

      expect(result.current.theme).toBe('light');
      expect(result.current.activeHost).toBe('claude');
      // Storage still wins for fields not in the URL.
      expect(result.current.locale).toBe('fr-FR');
    });
  });
});
