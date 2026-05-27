import { act, renderHook } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { deriveContainerDimensions, useInspectorState } from './use-inspector-state';
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

  it('uses the viewport width for fullscreen container dimensions', () => {
    expect(
      deriveContainerDimensions({
        displayMode: 'fullscreen',
        measuredContentWidth: 512,
        viewportHeight: 900,
        viewportWidth: 1440,
      })
    ).toEqual({ height: 848, width: 512 });
  });

  it('falls back to viewport width for fullscreen container dimensions before measuring', () => {
    expect(
      deriveContainerDimensions({
        displayMode: 'fullscreen',
        viewportHeight: 900,
        viewportWidth: 1440,
      })
    ).toEqual({ height: 848, width: 1440 });
  });

  it('stores structured model context for future model turns without changing resource state', () => {
    const simulations = { 'ui-tool': createSim('ui-tool', true) };
    const { result } = renderHook(() => useInspectorState({ simulations }));

    act(() => {
      result.current.handleUpdateModelContext([], { selectedAlbum: 'Pizza Tour' });
    });

    expect(result.current.modelContext).toBeNull();
    expect(result.current.modelAppContext).toEqual({
      content: [],
      structuredContent: { selectedAlbum: 'Pizza Tour' },
    });
  });

  it('stores text-only model context without injecting it as resource state', () => {
    const simulations = { 'ui-tool': createSim('ui-tool', true) };
    const { result } = renderHook(() => useInspectorState({ simulations }));

    act(() => {
      result.current.handleUpdateModelContext([{ type: 'text', text: 'Viewing page 2 of 4' }]);
    });

    expect(result.current.modelContext).toBeNull();
    expect(result.current.modelAppContext).toEqual({
      content: [{ type: 'text', text: 'Viewing page 2 of 4' }],
    });
  });

  it('clears model context when the app writes empty content', () => {
    const simulations = { 'ui-tool': createSim('ui-tool', true) };
    const { result } = renderHook(() => useInspectorState({ simulations }));

    act(() => {
      result.current.handleUpdateModelContext([], { selectedAlbum: 'Pizza Tour' });
    });
    act(() => {
      result.current.handleUpdateModelContext([]);
    });

    expect(result.current.modelContext).toBeNull();
    expect(result.current.modelAppContext).toBeNull();
  });

  it('keeps app-written model context across simulation changes', () => {
    const simulations = {
      first: createSim('first', true),
      second: createSim('second', true),
    };
    const { result } = renderHook(() => useInspectorState({ simulations }));

    act(() => {
      result.current.handleUpdateModelContext([], { selectedAlbum: 'Pizza Tour' });
    });
    act(() => {
      result.current.setSelectedSimulationName('second');
    });

    expect(result.current.modelAppContext).toEqual({
      content: [],
      structuredContent: { selectedAlbum: 'Pizza Tour' },
    });
    expect(result.current.modelContextJson).toBe('{\n  "selectedAlbum": "Pizza Tour"\n}');
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
