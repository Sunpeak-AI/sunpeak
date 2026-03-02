import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  McpUiHostContext,
  McpUiDisplayMode,
  McpUiTheme,
  McpUiResourcePermissions,
} from '@modelcontextprotocol/ext-apps';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { Simulation } from '../types/simulation';
import type { ScreenWidth } from './simulator-types';
import type { HostId } from './hosts';
import { extractResourceCSP, type ResourceCSP } from './iframe-resource';

type Platform = NonNullable<McpUiHostContext['platform']>;

const DEFAULT_THEME: McpUiTheme = 'dark';
const DEFAULT_DISPLAY_MODE: McpUiDisplayMode = 'inline';
const DEFAULT_PLATFORM: Platform = 'desktop';

export interface UseSimulatorStateOptions {
  simulations: Record<string, Simulation>;
  defaultHost?: HostId;
}

export interface SimulatorState {
  // ── Simulation selection ──
  simulationNames: string[];
  selectedSimulationName: string;
  setSelectedSimulationName: (name: string) => void;
  selectedSim: Simulation | undefined;

  // ── Host selection ──
  activeHost: HostId;
  setActiveHost: (host: HostId) => void;

  // ── Screen width ──
  screenWidth: ScreenWidth;
  setScreenWidth: (width: ScreenWidth) => void;

  // ── Host context ──
  theme: McpUiTheme;
  setTheme: (theme: McpUiTheme) => void;
  displayMode: McpUiDisplayMode;
  setDisplayMode: (mode: McpUiDisplayMode) => void;
  locale: string;
  setLocale: (locale: string) => void;
  containerMaxHeight: number;
  setContainerMaxHeight: (height: number) => void;
  platform: Platform;
  setPlatform: (platform: Platform) => void;
  hover: boolean;
  setHover: (hover: boolean) => void;
  touch: boolean;
  setTouch: (touch: boolean) => void;
  safeAreaInsets: { top: number; bottom: number; left: number; right: number };
  setSafeAreaInsets: React.Dispatch<
    React.SetStateAction<{ top: number; bottom: number; left: number; right: number }>
  >;
  timeZone: string;
  setTimeZone: (tz: string) => void;
  userAgent: string;
  setUserAgent: (ua: string) => void;

  // ── Computed host context ──
  hostContext: McpUiHostContext;

  // ── Display mode transition ──
  readyDisplayMode: McpUiDisplayMode;
  handleDisplayModeReady: (mode: string) => void;
  isTransitioning: boolean;

  // ── Tool data ──
  toolInput: Record<string, unknown>;
  setToolInput: (input: Record<string, unknown>) => void;
  toolResult: CallToolResult | undefined;
  setToolResult: (result: CallToolResult | undefined) => void;
  effectiveToolResult: CallToolResult | undefined;

  // ── Model context ──
  modelContext: Record<string, unknown> | null;
  setModelContext: (ctx: Record<string, unknown> | null) => void;

  // ── JSON editing state (for sidebar) ──
  toolInputJson: string;
  setToolInputJson: (json: string) => void;
  toolInputError: string;
  setToolInputError: (error: string) => void;
  toolResultJson: string;
  setToolResultJson: (json: string) => void;
  toolResultError: string;
  setToolResultError: (error: string) => void;
  modelContextJson: string;
  setModelContextJson: (json: string) => void;
  modelContextError: string;
  setModelContextError: (error: string) => void;
  editingField: string | null;
  setEditingField: (field: string | null) => void;

  // ── JSON helpers ──
  validateJSON: (
    json: string,
    setJson: (value: string) => void,
    setError: (error: string) => void
  ) => void;
  commitJSON: (
    json: string,
    setError: (error: string) => void,
    updateFn: (value: Record<string, unknown> | null) => void
  ) => void;

  // ── Host callbacks ──
  handleDisplayModeChange: (mode: McpUiDisplayMode) => void;
  handleUpdateModelContext: (content: unknown[], structuredContent?: unknown) => void;

  // ── Streaming tool input ──
  toolInputPartial: Record<string, unknown> | undefined;
  sendToolInputPartial: () => void;

  // ── Content props (for IframeResource) ──
  resourceUrl: string | undefined;
  resourceScript: string | undefined;
  csp: ResourceCSP | undefined;
  permissions: McpUiResourcePermissions | undefined;
  prefersBorder: boolean;
  domain: string | undefined;
  hasIframeContent: boolean;
}

/**
 * Parse URL params for initial simulator values.
 * Supported params:
 * - simulation: simulation name (e.g., 'show-albums')
 * - theme: 'light' | 'dark'
 * - displayMode: 'inline' | 'pip' | 'fullscreen'
 * - locale: e.g., 'en-US'
 * - maxHeight: number (for pip mode)
 * - deviceType: 'mobile' | 'tablet' | 'desktop' → maps to platform
 * - hover: 'true' | 'false'
 * - touch: 'true' | 'false'
 * - safeAreaTop, safeAreaBottom, safeAreaLeft, safeAreaRight: number
 * - host: 'chatgpt' | 'claude'
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
  host?: HostId;
} {
  if (typeof window === 'undefined') return {};

  const params = new URLSearchParams(window.location.search);

  const simulation = params.get('simulation') ?? undefined;
  const theme = params.get('theme') as McpUiTheme | null;
  const displayMode = params.get('displayMode') as McpUiDisplayMode | null;
  const locale = params.get('locale');
  const maxHeightParam = params.get('maxHeight');
  const containerMaxHeight = maxHeightParam ? Number(maxHeightParam) : undefined;
  const host = (params.get('host') as HostId) ?? undefined;

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
    host: host ?? undefined,
  };
}

export function useSimulatorState({
  simulations,
  defaultHost = 'chatgpt',
}: UseSimulatorStateOptions): SimulatorState {
  const simulationNames = Object.keys(simulations).sort((a, b) => {
    const simA = simulations[a];
    const simB = simulations[b];
    const labelA = `${(simA.resource.title as string) || simA.resource.name}: ${(simA.tool.title as string) || simA.tool.name}`;
    const labelB = `${(simB.resource.title as string) || simB.resource.name}: ${(simB.tool.title as string) || simB.tool.name}`;
    return labelA.localeCompare(labelB);
  });
  const urlParams = useMemo(() => parseUrlParams(), []);
  const [screenWidth, setScreenWidth] = useState<ScreenWidth>('full');

  const isMobileWidth = (width: ScreenWidth) => width === 'mobile-s' || width === 'mobile-l';

  // ── Host selection ──
  const [activeHost, setActiveHost] = useState<HostId>(urlParams.host ?? defaultHost);

  // ── Simulation selection ──
  const initialSimulationName = useMemo(() => {
    const defaultName = simulationNames[0] ?? '';
    if (!urlParams.simulation) return defaultName;
    return urlParams.simulation in simulations ? urlParams.simulation : defaultName;
  }, [urlParams.simulation, simulations, simulationNames]);

  const [selectedSimulationName, setSelectedSimulationName] =
    useState<string>(initialSimulationName);

  const selectedSim = simulations[selectedSimulationName];

  // ── Host context state ──

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
  const [timeZone, setTimeZone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [userAgent, setUserAgent] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.userAgent : ''
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
      timeZone,
      userAgent,
      platform,
      deviceCapabilities: { hover, touch },
      safeAreaInsets,
      ...(displayMode === 'pip' ? { containerDimensions: { maxHeight: containerMaxHeight } } : {}),
    }),
    [
      theme,
      displayMode,
      locale,
      timeZone,
      userAgent,
      platform,
      hover,
      touch,
      safeAreaInsets,
      containerMaxHeight,
    ]
  );

  // ── Tool data state ──

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

  // Model context
  const [modelContextJson, setModelContextJson] = useState<string>('null');
  const [modelContext, setModelContext] = useState<Record<string, unknown> | null>(null);

  // Track which field is being edited
  const [editingField, setEditingField] = useState<string | null>(null);

  // JSON validation errors
  const [toolInputError, setToolInputError] = useState('');
  const [toolResultError, setToolResultError] = useState('');
  const [modelContextError, setModelContextError] = useState('');

  // Reset tool data when simulation changes
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

  // ── Host callbacks ──

  const handleDisplayModeChange = (mode: McpUiDisplayMode) => {
    setDisplayMode(mode);
  };

  const handleUpdateModelContext = (content: unknown[], structuredContent?: unknown) => {
    setModelContextJson(JSON.stringify(structuredContent ?? content, null, 2));
  };

  // ── JSON helpers ──

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

  // ── Content props ──

  const effectiveToolResult = useMemo((): CallToolResult | undefined => {
    if (!toolResult && !modelContext) return undefined;
    if (!modelContext) return toolResult;

    const baseResult = toolResult ?? { content: [] };
    const baseStructured = (baseResult.structuredContent as Record<string, unknown>) ?? {};
    return {
      ...baseResult,
      structuredContent: { ...baseStructured, ...modelContext },
    };
  }, [toolResult, modelContext]);

  const resourceUrl = selectedSim?.resourceUrl;
  const resourceScript = selectedSim?.resourceScript;
  const csp = selectedSim ? extractResourceCSP(selectedSim.resource) : undefined;
  const resourceMeta = (selectedSim?.resource._meta as Record<string, unknown> | undefined)?.ui as
    | { permissions?: McpUiResourcePermissions; prefersBorder?: boolean; domain?: string }
    | undefined;
  const permissions = resourceMeta?.permissions;
  const prefersBorder = resourceMeta?.prefersBorder ?? false;
  const domain = resourceMeta?.domain;
  const hasIframeContent = !!(resourceUrl || resourceScript);
  const isTransitioning = hasIframeContent && displayMode !== readyDisplayMode;

  // ── Streaming tool input partial ──
  const [toolInputPartial, setToolInputPartial] = useState<Record<string, unknown> | undefined>(
    undefined
  );

  const sendToolInputPartial = useCallback(() => {
    try {
      const parsed = JSON.parse(toolInputJson);
      if (parsed && typeof parsed === 'object') {
        setToolInputPartial(parsed as Record<string, unknown>);
      }
    } catch {
      // Invalid JSON, ignore
    }
  }, [toolInputJson]);

  return {
    simulationNames,
    selectedSimulationName,
    setSelectedSimulationName,
    selectedSim,

    activeHost,
    setActiveHost,

    screenWidth,
    setScreenWidth,

    theme,
    setTheme,
    displayMode,
    setDisplayMode,
    locale,
    setLocale,
    containerMaxHeight,
    setContainerMaxHeight,
    platform,
    setPlatform,
    hover,
    setHover,
    touch,
    setTouch,
    safeAreaInsets,
    setSafeAreaInsets,
    timeZone,
    setTimeZone,
    userAgent,
    setUserAgent,

    hostContext,

    readyDisplayMode,
    handleDisplayModeReady,
    isTransitioning,

    toolInput,
    setToolInput,
    toolResult,
    setToolResult,
    effectiveToolResult,

    modelContext,
    setModelContext,

    toolInputJson,
    setToolInputJson,
    toolInputError,
    setToolInputError,
    toolResultJson,
    setToolResultJson,
    toolResultError,
    setToolResultError,
    modelContextJson,
    setModelContextJson,
    modelContextError,
    setModelContextError,
    editingField,
    setEditingField,

    validateJSON,
    commitJSON,

    handleDisplayModeChange,
    handleUpdateModelContext,

    toolInputPartial,
    sendToolInputPartial,

    resourceUrl,
    resourceScript,
    csp,
    permissions,
    prefersBorder,
    domain,
    hasIframeContent,
  };
}
