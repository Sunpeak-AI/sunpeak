import * as React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  SimpleSidebar,
  SidebarControl,
  SidebarCollapsibleControl,
  SidebarSelect,
  SidebarInput,
  SidebarCheckbox,
  SidebarTextarea,
  SidebarToggle,
} from './simple-sidebar';
import { Conversation } from './conversation';
import { IframeResource } from './iframe-resource';
import { ThemeProvider } from './theme-provider';
import type {
  McpUiHostContext,
  McpUiDisplayMode,
  McpUiTheme,
} from '@modelcontextprotocol/ext-apps';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { ScreenWidth } from './chatgpt-simulator-types';
import type { Simulation } from '../types/simulation';

type Platform = NonNullable<McpUiHostContext['platform']>;

const DEFAULT_THEME: McpUiTheme = 'dark';
const DEFAULT_DISPLAY_MODE: McpUiDisplayMode = 'inline';
const DEFAULT_PLATFORM: Platform = 'desktop';

interface ChatGPTSimulatorProps {
  children?: React.ReactNode;
  simulations?: Record<string, Simulation>;
  appName?: string;
  appIcon?: string;
}

/**
 * Parse URL params for initial simulator values.
 * Supported params:
 * - simulation: simulation name (e.g., 'albums-show')
 * - theme: 'light' | 'dark'
 * - displayMode: 'inline' | 'pip' | 'fullscreen'
 * - locale: e.g., 'en-US'
 * - maxHeight: number (for pip mode)
 * - deviceType: 'mobile' | 'tablet' | 'desktop' → maps to platform
 * - hover: 'true' | 'false'
 * - touch: 'true' | 'false'
 * - safeAreaTop, safeAreaBottom, safeAreaLeft, safeAreaRight: number
 */
function parseUrlParams(): {
  simulation?: string;
  theme?: McpUiTheme;
  displayMode?: McpUiDisplayMode;
  locale?: string;
  containerMaxHeight?: number;
  platform?: Platform;
  deviceCapabilities?: { hover?: boolean; touch?: boolean };
  safeAreaInsets?: { top: number; bottom: number; left: number; right: number };
} {
  if (typeof window === 'undefined') return {};

  const params = new URLSearchParams(window.location.search);

  const simulation = params.get('simulation') ?? undefined;
  const theme = params.get('theme') as McpUiTheme | null;
  const displayMode = params.get('displayMode') as McpUiDisplayMode | null;
  const locale = params.get('locale');
  const maxHeightParam = params.get('maxHeight');
  const containerMaxHeight = maxHeightParam ? Number(maxHeightParam) : undefined;

  // Map deviceType param to MCP Apps platform
  const deviceType = params.get('deviceType');
  let platform: Platform | undefined;
  if (deviceType === 'mobile' || deviceType === 'tablet') {
    platform = 'mobile';
  } else if (deviceType === 'desktop') {
    platform = 'desktop';
  }

  // Device capabilities
  const hoverParam = params.get('hover');
  const touchParam = params.get('touch');
  const hasCapParams = hoverParam || touchParam;
  const deviceCapabilities = hasCapParams
    ? {
        hover: hoverParam === 'false' ? false : true,
        touch: touchParam === 'true' ? true : false,
      }
    : undefined;

  // Safe area insets
  const safeAreaTop = params.get('safeAreaTop');
  const safeAreaBottom = params.get('safeAreaBottom');
  const safeAreaLeft = params.get('safeAreaLeft');
  const safeAreaRight = params.get('safeAreaRight');
  const hasSafeAreaParams = safeAreaTop || safeAreaBottom || safeAreaLeft || safeAreaRight;
  const safeAreaInsets = hasSafeAreaParams
    ? {
        top: safeAreaTop ? Number(safeAreaTop) : 0,
        bottom: safeAreaBottom ? Number(safeAreaBottom) : 0,
        left: safeAreaLeft ? Number(safeAreaLeft) : 0,
        right: safeAreaRight ? Number(safeAreaRight) : 0,
      }
    : undefined;

  return {
    simulation,
    theme: theme ?? undefined,
    displayMode: displayMode ?? undefined,
    locale: locale ?? undefined,
    containerMaxHeight,
    platform,
    deviceCapabilities,
    safeAreaInsets,
  };
}

export function ChatGPTSimulator({
  children,
  simulations = {},
  appName = 'Sunpeak',
  appIcon,
}: ChatGPTSimulatorProps) {
  const simulationNames = Object.keys(simulations);
  const urlParams = useMemo(() => parseUrlParams(), []);
  const [screenWidth, setScreenWidth] = React.useState<ScreenWidth>('full');

  const isMobileWidth = (width: ScreenWidth) => width === 'mobile-s' || width === 'mobile-l';

  // Find initial simulation from URL params
  const initialSimulationName = useMemo(() => {
    const defaultName = simulationNames[0] ?? '';
    if (!urlParams.simulation) return defaultName;
    return urlParams.simulation in simulations ? urlParams.simulation : defaultName;
  }, [urlParams.simulation, simulations, simulationNames]);

  const [selectedSimulationName, setSelectedSimulationName] =
    React.useState<string>(initialSimulationName);

  const selectedSim = simulations[selectedSimulationName];

  // ── Host context state ──────────────────────────────────────────

  const [theme, setTheme] = useState<McpUiTheme>(urlParams.theme ?? DEFAULT_THEME);
  const [displayMode, _setDisplayMode] = useState<McpUiDisplayMode>(
    urlParams.displayMode ?? DEFAULT_DISPLAY_MODE
  );
  const [locale, setLocale] = useState(urlParams.locale ?? 'en-US');
  const [containerMaxHeight, setContainerMaxHeight] = useState(urlParams.containerMaxHeight ?? 480);
  const [platform, setPlatform] = useState<Platform>(urlParams.platform ?? DEFAULT_PLATFORM);
  const [hover, setHover] = useState(urlParams.deviceCapabilities?.hover ?? true);
  const [touch, setTouch] = useState(urlParams.deviceCapabilities?.touch ?? false);
  const [safeAreaInsets, setSafeAreaInsets] = useState(
    urlParams.safeAreaInsets ?? { top: 0, bottom: 0, left: 0, right: 0 }
  );

  // Display mode setter that respects mobile width constraints
  const setDisplayMode = (mode: McpUiDisplayMode) => {
    if (isMobileWidth(screenWidth) && mode === 'pip') {
      _setDisplayMode('fullscreen');
    } else {
      _setDisplayMode(mode);
    }
  };

  // Track which display mode the iframe has confirmed rendering.
  // Content is hidden when displayMode !== readyDisplayMode (transition in progress).
  // Initialized to displayMode so there's no transition on first render.
  const [readyDisplayMode, setReadyDisplayMode] = useState<McpUiDisplayMode>(
    urlParams.displayMode ?? DEFAULT_DISPLAY_MODE
  );

  const handleDisplayModeReady = useCallback((mode: string) => {
    setReadyDisplayMode(mode as McpUiDisplayMode);
  }, []);

  // Build host context from state
  const hostContext = useMemo<McpUiHostContext>(
    () => ({
      theme,
      displayMode,
      locale,
      platform,
      deviceCapabilities: { hover, touch },
      safeAreaInsets,
      ...(displayMode === 'pip' ? { containerDimensions: { maxHeight: containerMaxHeight } } : {}),
    }),
    [theme, displayMode, locale, platform, hover, touch, safeAreaInsets, containerMaxHeight]
  );

  // ── Tool data state ─────────────────────────────────────────────

  // Parsed tool data (sent to host/iframe)
  const [toolInput, setToolInput] = useState<Record<string, unknown>>(
    () => selectedSim?.toolInput ?? {}
  );
  const [toolResult, setToolResult] = useState<CallToolResult | undefined>(
    () => selectedSim?.toolResult as CallToolResult | undefined
  );

  // Editable JSON strings for sidebar
  const [toolInputJson, setToolInputJson] = useState(() => JSON.stringify(toolInput, null, 2));
  const [toolResultJson, setToolResultJson] = useState(() =>
    JSON.stringify(toolResult ?? null, null, 2)
  );

  // Model context - bidirectional: shows what app sends, editable to inject state back
  // When edited, gets merged into toolResult.structuredContent to send to app
  const [modelContextJson, setModelContextJson] = useState<string>('null');
  const [modelContext, setModelContext] = useState<Record<string, unknown> | null>(null);

  // Track which field is being edited to prevent reset loops
  const [editingField, setEditingField] = useState<string | null>(null);

  // JSON validation errors
  const [toolInputError, setToolInputError] = useState('');
  const [toolResultError, setToolResultError] = useState('');
  const [modelContextError, setModelContextError] = useState('');

  // Reset tool data when simulation changes
  // Note: editingField is intentionally NOT in deps - we check it inside to guard
  // against overwriting user edits, but we don't want changes to editingField
  // to trigger a re-run (which would reset values when editing ends)
  useEffect(() => {
    const newInput = selectedSim?.toolInput ?? {};
    const newResult = (selectedSim?.toolResult as CallToolResult | undefined) ?? undefined;
    setToolInput(newInput);
    setToolResult(newResult);
    if (editingField !== 'toolInput') {
      setToolInputJson(JSON.stringify(newInput, null, 2));
      setToolInputError('');
    }
    if (editingField !== 'toolResult') {
      setToolResultJson(JSON.stringify(newResult ?? null, null, 2));
      setToolResultError('');
    }
    if (editingField !== 'modelContext') {
      setModelContextJson('null');
      setModelContext(null);
      setModelContextError('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSimulationName, selectedSim]);

  // Disallow PiP on mobile widths
  useEffect(() => {
    if (isMobileWidth(screenWidth) && displayMode === 'pip') {
      _setDisplayMode('fullscreen');
    }
  }, [screenWidth, displayMode]);

  // ── Host callbacks ──────────────────────────────────────────────

  const handleDisplayModeChange = (mode: McpUiDisplayMode) => {
    setDisplayMode(mode);
  };

  const handleUpdateModelContext = (content: unknown[], structuredContent?: unknown) => {
    setModelContextJson(JSON.stringify(structuredContent ?? content, null, 2));
  };

  // ── JSON helpers ────────────────────────────────────────────────

  const validateJSON = (
    json: string,
    setJson: (value: string) => void,
    setError: (error: string) => void
  ) => {
    setJson(json);
    try {
      if (json.trim() !== '') JSON.parse(json);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid JSON');
    }
  };

  const commitJSON = (
    json: string,
    setError: (error: string) => void,
    updateFn: (value: Record<string, unknown> | null) => void
  ) => {
    try {
      const parsed = json.trim() === '' ? null : JSON.parse(json);
      setError('');
      updateFn(parsed);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid JSON');
    } finally {
      setEditingField(null);
    }
  };

  // ── Content rendering ───────────────────────────────────────────

  // Merge modelContext into toolResult.structuredContent when sending to app
  // This simulates a host that round-trips app state (like ChatGPT's widgetState)
  const effectiveToolResult = useMemo((): CallToolResult | undefined => {
    if (!toolResult && !modelContext) return undefined;
    if (!modelContext) return toolResult;

    // Merge modelContext into structuredContent
    const baseResult = toolResult ?? { content: [] };
    const baseStructured = (baseResult.structuredContent as Record<string, unknown>) ?? {};
    return {
      ...baseResult,
      structuredContent: { ...baseStructured, ...modelContext },
    };
  }, [toolResult, modelContext]);

  // Get resource URL (dev mode) or script URL (production)
  const resourceUrl = selectedSim?.resourceUrl;
  const resourceScript = selectedSim?.resourceScript;

  // Extract CSP from resource metadata
  const resourceMeta = selectedSim?.resource._meta as Record<string, unknown> | undefined;
  const resourceUi = resourceMeta?.ui as
    | { csp?: { connectDomains?: string[]; resourceDomains?: string[] }; domain?: string }
    | undefined;
  const csp = resourceUi?.csp;

  // Build content based on rendering mode
  // All rendering goes through IframeResource for consistent behavior with ChatGPT
  const hasIframeContent = !!(resourceUrl || resourceScript);

  // Content is transitioning when the display mode has changed but the iframe
  // hasn't yet confirmed it has rendered with the new mode.
  // For non-iframe content (children), there's no async rendering so no transition.
  const isTransitioning = hasIframeContent && displayMode !== readyDisplayMode;

  let content: React.ReactNode;
  if (resourceUrl) {
    // Dev mode: load HTML page directly (supports Vite HMR)
    content = (
      <IframeResource
        src={resourceUrl}
        hostContext={hostContext}
        toolInput={toolInput}
        toolResult={effectiveToolResult}
        hostOptions={{
          onDisplayModeChange: handleDisplayModeChange,
          onUpdateModelContext: handleUpdateModelContext,
        }}
        onDisplayModeReady={handleDisplayModeReady}
        debugInjectState={modelContext}
        className="h-full w-full"
      />
    );
  } else if (resourceScript) {
    // Production mode: generate HTML wrapper for script
    content = (
      <IframeResource
        scriptSrc={resourceScript}
        hostContext={hostContext}
        toolInput={toolInput}
        toolResult={effectiveToolResult}
        csp={csp}
        hostOptions={{
          onDisplayModeChange: handleDisplayModeChange,
          onUpdateModelContext: handleUpdateModelContext,
        }}
        onDisplayModeReady={handleDisplayModeReady}
        debugInjectState={modelContext}
        className="h-full w-full"
      />
    );
  } else {
    content = children;
  }

  return (
    <ThemeProvider theme={theme}>
      <SimpleSidebar
        controls={
          <div className="space-y-2">
            {simulationNames.length > 1 && (
              <SidebarControl label="Simulation">
                <SidebarSelect
                  value={selectedSimulationName}
                  onChange={(value) => setSelectedSimulationName(value)}
                  options={simulationNames.map((name) => {
                    const sim = simulations[name];
                    const resourceTitle =
                      (sim.resource.title as string | undefined) || sim.resource.name;
                    const toolTitle = (sim.tool.title as string | undefined) || sim.tool.name;
                    return {
                      value: name,
                      label: `${resourceTitle}: ${toolTitle}`,
                    };
                  })}
                />
              </SidebarControl>
            )}

            <SidebarControl label="Simulation Width">
              <SidebarSelect
                value={screenWidth}
                onChange={(value) => setScreenWidth(value as ScreenWidth)}
                options={[
                  { value: 'mobile-s', label: 'Mobile S (375px)' },
                  { value: 'mobile-l', label: 'Mobile L (425px)' },
                  { value: 'tablet', label: 'Tablet (768px)' },
                  { value: 'full', label: '100% (Full)' },
                ]}
              />
            </SidebarControl>

            <SidebarCollapsibleControl label="Host Context" defaultCollapsed={false}>
              <div className="space-y-2">
                <SidebarControl label="Theme">
                  <SidebarToggle
                    value={theme}
                    onChange={(value) => setTheme(value as McpUiTheme)}
                    options={[
                      { value: 'light', label: 'Light' },
                      { value: 'dark', label: 'Dark' },
                    ]}
                  />
                </SidebarControl>

                <SidebarControl label="Display Mode">
                  <SidebarToggle
                    value={displayMode}
                    onChange={(value) => setDisplayMode(value as McpUiDisplayMode)}
                    options={[
                      { value: 'inline', label: 'Inline' },
                      { value: 'pip', label: 'PiP' },
                      { value: 'fullscreen', label: 'Full' },
                    ]}
                  />
                </SidebarControl>

                <div className="grid grid-cols-2 gap-2">
                  <SidebarControl label="Locale">
                    <SidebarInput
                      value={locale}
                      onChange={(value) => setLocale(value)}
                      placeholder="e.g. en-US"
                    />
                  </SidebarControl>

                  <SidebarControl label="Max Height (PiP)">
                    <SidebarInput
                      type="number"
                      value={
                        displayMode === 'pip' && containerMaxHeight !== undefined
                          ? String(containerMaxHeight)
                          : ''
                      }
                      onChange={(value) => {
                        if (displayMode === 'pip') {
                          setContainerMaxHeight(value ? Number(value) : 480);
                        }
                      }}
                      placeholder={displayMode === 'pip' ? '480' : '-'}
                      disabled={displayMode !== 'pip'}
                    />
                  </SidebarControl>
                </div>

                <SidebarControl label="Platform">
                  <SidebarSelect
                    value={platform}
                    onChange={(value) => {
                      const p = value as Platform;
                      setPlatform(p);
                      // Set appropriate default capabilities based on platform
                      if (p === 'mobile') {
                        setHover(false);
                        setTouch(true);
                      } else if (p === 'desktop') {
                        setHover(true);
                        setTouch(false);
                      } else {
                        setHover(true);
                        setTouch(false);
                      }
                    }}
                    options={[
                      { value: 'mobile', label: 'Mobile' },
                      { value: 'desktop', label: 'Desktop' },
                      { value: 'web', label: 'Web' },
                    ]}
                  />
                </SidebarControl>

                <div className="pl-4">
                  <SidebarControl label="Device Capabilities">
                    <div className="flex gap-2">
                      <SidebarCheckbox checked={hover} onChange={setHover} label="Hover" />
                      <SidebarCheckbox checked={touch} onChange={setTouch} label="Touch" />
                    </div>
                  </SidebarControl>
                </div>

                <SidebarControl label="Safe Area Insets">
                  <div className="grid grid-cols-4 gap-1">
                    <div className="flex items-center gap-0.5">
                      <span className="text-[10px] text-secondary">&uarr;</span>
                      <SidebarInput
                        type="number"
                        value={String(safeAreaInsets.top)}
                        onChange={(value) =>
                          setSafeAreaInsets((prev) => ({ ...prev, top: Number(value) }))
                        }
                      />
                    </div>
                    <div className="flex items-center gap-0.5">
                      <span className="text-[10px] text-secondary">&darr;</span>
                      <SidebarInput
                        type="number"
                        value={String(safeAreaInsets.bottom)}
                        onChange={(value) =>
                          setSafeAreaInsets((prev) => ({ ...prev, bottom: Number(value) }))
                        }
                      />
                    </div>
                    <div className="flex items-center gap-0.5">
                      <span className="text-[10px] text-secondary">&larr;</span>
                      <SidebarInput
                        type="number"
                        value={String(safeAreaInsets.left)}
                        onChange={(value) =>
                          setSafeAreaInsets((prev) => ({ ...prev, left: Number(value) }))
                        }
                      />
                    </div>
                    <div className="flex items-center gap-0.5">
                      <span className="text-[10px] text-secondary">&rarr;</span>
                      <SidebarInput
                        type="number"
                        value={String(safeAreaInsets.right)}
                        onChange={(value) =>
                          setSafeAreaInsets((prev) => ({ ...prev, right: Number(value) }))
                        }
                      />
                    </div>
                  </div>
                </SidebarControl>
              </div>
            </SidebarCollapsibleControl>

            <SidebarCollapsibleControl label="App Context" defaultCollapsed>
              <SidebarTextarea
                value={modelContextJson}
                onChange={(json) => validateJSON(json, setModelContextJson, setModelContextError)}
                onFocus={() => setEditingField('modelContext')}
                onBlur={() =>
                  commitJSON(modelContextJson, setModelContextError, (parsed) => {
                    setModelContext(parsed as Record<string, unknown> | null);
                  })
                }
                error={modelContextError}
                maxRows={8}
              />
            </SidebarCollapsibleControl>

            <SidebarCollapsibleControl label="Tool Input (JSON)">
              <SidebarTextarea
                value={toolInputJson}
                onChange={(json) => validateJSON(json, setToolInputJson, setToolInputError)}
                onFocus={() => setEditingField('toolInput')}
                onBlur={() =>
                  commitJSON(toolInputJson, setToolInputError, (parsed) =>
                    setToolInput((parsed as Record<string, unknown>) ?? {})
                  )
                }
                error={toolInputError}
                maxRows={8}
              />
            </SidebarCollapsibleControl>

            <SidebarCollapsibleControl label="Tool Result (JSON)">
              <SidebarTextarea
                value={toolResultJson}
                onChange={(json) => validateJSON(json, setToolResultJson, setToolResultError)}
                onFocus={() => setEditingField('toolResult')}
                onBlur={() =>
                  commitJSON(toolResultJson, setToolResultError, (parsed) => {
                    if (parsed === null) {
                      setToolResult(undefined);
                    } else {
                      // Wrap raw object as structuredContent in a CallToolResult
                      const result = parsed as Record<string, unknown>;
                      if ('content' in result || 'structuredContent' in result) {
                        setToolResult(result as CallToolResult);
                      } else {
                        setToolResult({ content: [], structuredContent: result });
                      }
                    }
                  })
                }
                error={toolResultError}
                maxRows={8}
              />
            </SidebarCollapsibleControl>
          </div>
        }
      >
        <Conversation
          screenWidth={screenWidth}
          displayMode={displayMode}
          platform={platform}
          onRequestDisplayMode={handleDisplayModeChange}
          appName={appName}
          appIcon={appIcon}
          userMessage={selectedSim?.userMessage}
          isTransitioning={isTransitioning}
          key={selectedSimulationName}
        >
          {content}
        </Conversation>
      </SimpleSidebar>
    </ThemeProvider>
  );
}
