import * as React from 'react';
import type {
  McpUiDisplayMode,
  McpUiTheme,
  McpUiHostContext,
} from '@modelcontextprotocol/ext-apps';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { useInspectorState } from './use-inspector-state';
import { useMcpConnection, type AuthType, type AuthConfig } from './use-mcp-connection';
import { IframeResource } from './iframe-resource';
import { ThemeProvider } from './theme-provider';
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
import { getHostShell, getRegisteredHosts, type HostId } from './hosts';
import { resolveServerToolResult } from '../types/simulation';
import type { Simulation } from '../types/simulation';
import type { ScreenWidth } from './inspector-types';

// Register built-in host shells. These imports live here (in the component file)
// rather than in the barrel index.ts because Rollup code-splitting can separate
// side-effect imports from barrel exports, letting consumer bundlers tree-shake
// them. Importing here makes registration part of the Inspector component's
// dependency graph, which can't be tree-shaken since the component is used.
import '../chatgpt/chatgpt-host';
import '../claude/claude-host';

const DOCS_BASE_URL = 'https://sunpeak.ai/docs';

export interface InspectorProps {
  children?: React.ReactNode;
  simulations?: Record<string, Simulation>;
  appName?: string;
  appIcon?: string;
  /** Which host shell to use initially. Defaults to 'chatgpt'. */
  defaultHost?: HostId;
  /** Override callServerTool resolution. When provided, bypasses simulation serverTools mocks. Routes through MCP which returns simulation fixture data for UI tools. */
  onCallTool?: (params: {
    name: string;
    arguments?: Record<string, unknown>;
  }) => Promise<CallToolResult> | CallToolResult;
  /** Direct tool handler call, bypassing MCP server mock data. Falls back to onCallTool if not provided. */
  onCallToolDirect?: (params: {
    name: string;
    arguments?: Record<string, unknown>;
  }) => Promise<CallToolResult> | CallToolResult;
  /** Initial prod-resources mode state. When true, resources load from dist/ instead of HMR. Defaults to false. */
  defaultProdResources?: boolean;
  /** Hide framework-only controls (Prod Resources) in the sidebar. */
  hideInspectorModes?: boolean;
  /**
   * Demo mode for embedding on marketing sites. When true:
   * - Hides Prod Resources checkbox
   * - Disables the MCP Server URL input (shows a static example URL)
   * - Hides the Run button (prevents sending real MCP requests)
   * - Hides connection status indicator
   */
  demoMode?: boolean;
  /**
   * Base URL of the separate-origin sandbox server (e.g., "http://localhost:24680").
   * When provided, the outer iframe loads from this URL instead of using srcdoc,
   * giving real cross-origin isolation that matches production hosts.
   */
  sandboxUrl?: string;
  /**
   * MCP server URL. Pre-populates the server URL field in the sidebar and
   * shows connection status. Users can edit this URL at any time to connect
   * to a different server.
   */
  mcpServerUrl?: string;
}

type Platform = 'mobile' | 'desktop' | 'web';

/** Info about a unique tool, derived from simulations. */
interface ToolInfo {
  tool: Simulation['tool'];
  resource?: Simulation['resource'];
  /** All simulation names for this tool (first entry is the "base" for resource URL). */
  simNames: string[];
  /** Simulation names that have fixture data (toolInput, toolResult, or serverTools). */
  fixtureSimNames: string[];
}

/** Check whether a simulation has user-authored fixture data. */
function hasFixtureData(sim: Simulation): boolean {
  return sim.toolResult != null || sim.toolInput != null || sim.serverTools != null;
}

export function Inspector({
  children,
  simulations: initialSimulations = {},
  appName = 'Sunpeak',
  appIcon,
  defaultHost = 'chatgpt',
  onCallTool,
  onCallToolDirect,
  defaultProdResources = false,
  hideInspectorModes = false,
  demoMode = false,
  sandboxUrl,
  mcpServerUrl,
}: InspectorProps) {
  // Simulations can be updated when the user reconnects to a different server.
  const [simulations, setSimulations] = React.useState(initialSimulations);
  // Sync with prop changes (e.g., HMR during development).
  React.useEffect(() => {
    setSimulations(initialSimulations);
  }, [initialSimulations]);

  // ── Derive tools from simulations ──
  // Each unique tool name becomes a ToolInfo with all its associated simulations.
  const toolMap = React.useMemo(() => {
    const map = new Map<string, ToolInfo>();
    for (const [simName, sim] of Object.entries(simulations)) {
      if (!sim.resource) continue; // Skip backend-only tools
      const toolName = sim.tool.name;
      if (!map.has(toolName)) {
        map.set(toolName, {
          tool: sim.tool,
          resource: sim.resource,
          simNames: [],
          fixtureSimNames: [],
        });
      }
      const info = map.get(toolName)!;
      info.simNames.push(simName);
      if (hasFixtureData(sim)) {
        info.fixtureSimNames.push(simName);
      }
    }
    return map;
  }, [simulations]);

  const toolNames = React.useMemo(
    () =>
      Array.from(toolMap.keys()).sort((a, b) => {
        const infoA = toolMap.get(a)!;
        const infoB = toolMap.get(b)!;
        const labelA = (infoA.tool.title as string | undefined) || a;
        const labelB = (infoB.tool.title as string | undefined) || b;
        return labelA.localeCompare(labelB);
      }),
    [toolMap]
  );

  // Parse URL params once for tool/simulation initialization.
  const initUrlParams = React.useMemo(() => {
    if (typeof window === 'undefined') return { tool: null, simulation: null, noMockData: false };
    const params = new URLSearchParams(window.location.search);
    return {
      tool: params.get('tool'),
      simulation: params.get('simulation'),
      noMockData: false,
    };
  }, []);

  // ── Tool selection ──
  // ?tool=X explicitly selects a tool. ?simulation=X infers the tool from the simulation.
  const [selectedToolName, setSelectedToolName] = React.useState(() => {
    if (initUrlParams.tool && toolMap.has(initUrlParams.tool)) return initUrlParams.tool;
    if (initUrlParams.simulation) {
      for (const [toolName, info] of toolMap) {
        if (info.simNames.includes(initUrlParams.simulation)) return toolName;
      }
    }
    return toolNames[0] ?? '';
  });

  // Reset tool selection when tools change (e.g., after reconnect)
  const prevToolNamesRef = React.useRef(toolNames);
  if (prevToolNamesRef.current !== toolNames) {
    prevToolNamesRef.current = toolNames;
    if (toolNames.length > 0 && !toolMap.has(selectedToolName)) {
      setSelectedToolName(toolNames[0]);
    }
  }

  const selectedToolInfo = toolMap.get(selectedToolName);

  // ── Simulation selection ──
  // null = "None" (no mock data, call the real server)
  // string = a specific simulation with fixture data
  // ?tool=X without ?simulation=Y means "select tool, no mock data"
  const [activeSimulationName, setActiveSimulationName] = React.useState<string | null>(() => {
    if (!selectedToolInfo) return null;
    if (initUrlParams.noMockData) return null;
    if (initUrlParams.tool && !initUrlParams.simulation) return null;
    // ?simulation=X explicitly selects a simulation (if it exists and has fixture data)
    if (
      initUrlParams.simulation &&
      selectedToolInfo.fixtureSimNames.includes(initUrlParams.simulation)
    ) {
      return initUrlParams.simulation;
    }
    return selectedToolInfo.fixtureSimNames[0] ?? null;
  });

  // When tool changes, auto-select first fixture simulation (or null)
  const prevToolNameRef = React.useRef(selectedToolName);
  if (prevToolNameRef.current !== selectedToolName) {
    prevToolNameRef.current = selectedToolName;
    const newInfo = toolMap.get(selectedToolName);
    setActiveSimulationName(newInfo?.fixtureSimNames[0] ?? null);
  }

  // The effective simulation name for useInspectorState:
  // - If a fixture simulation is active, use it (for tool input, tool result, resource URL)
  // - Otherwise, use the base simulation for the tool (for resource URL, tool definition)
  const effectiveSimulationName = activeSimulationName ?? selectedToolInfo?.simNames[0] ?? '';

  // Derive the current simulation directly from simulations + effectiveSimulationName.
  // This avoids the one-render lag from the useEffect sync to state.selectedSimulationName.
  const currentSim = simulations[effectiveSimulationName];

  const state = useInspectorState({ simulations, defaultHost });
  const [serverUrl, setServerUrl] = React.useState(mcpServerUrl ?? '');
  const [authType, setAuthType] = React.useState<AuthType>('none');
  const [bearerToken, setBearerToken] = React.useState('');
  const [oauthScopes, setOauthScopes] = React.useState('');
  const [oauthClientId, setOauthClientId] = React.useState('');
  const [oauthClientSecret, setOauthClientSecret] = React.useState('');
  const [oauthStatus, setOauthStatus] = React.useState<
    'none' | 'authorizing' | 'authorized' | 'error'
  >('none');
  const [oauthError, setOauthError] = React.useState<string | undefined>();

  // useMcpConnection does a mount-only health check for the initial URL.
  // URL changes are handled below via connection.reconnect().
  const connection = useMcpConnection(mcpServerUrl || undefined);
  const [prodResources, setProdResources] = React.useState(
    state.urlProdResources ?? defaultProdResources
  );
  const showSidebar = state.urlSidebar !== false;
  const showDevOverlay = state.urlDevOverlay !== false;
  const [isRunning, setIsRunning] = React.useState(false);
  const [hasRun, setHasRun] = React.useState(false);
  const [showCheck, setShowCheck] = React.useState(false);
  const checkTimerRef = React.useRef<ReturnType<typeof setTimeout>>(undefined);
  const oauthCleanupRef = React.useRef<(() => void) | undefined>(undefined);

  // Keep useInspectorState's selection in sync with our tool/simulation selection.
  React.useEffect(() => {
    state.setSelectedSimulationName(effectiveSimulationName);
  }, [effectiveSimulationName]); // eslint-disable-line react-hooks/exhaustive-deps

  // Build the current auth config for reconnects
  const currentAuthConfig = React.useMemo<AuthConfig | undefined>(() => {
    if (authType === 'bearer' && bearerToken) {
      return { type: 'bearer', bearerToken };
    }
    if (authType === 'oauth') {
      return { type: 'oauth' };
    }
    return undefined;
  }, [authType, bearerToken]);

  // Handle URL changes: when the user edits the server URL, reconnect to the new server.
  // The hook's mount-only health check handles the initial URL — this effect handles changes.
  const prevServerUrlRef = React.useRef(serverUrl);
  React.useEffect(() => {
    const urlChanged = serverUrl !== prevServerUrlRef.current;
    prevServerUrlRef.current = serverUrl;
    if (!urlChanged) return;
    if (serverUrl) {
      // Reset OAuth status when URL changes
      setOauthStatus('none');
      setOauthError(undefined);
      if (authType === 'oauth') {
        // Don't auto-connect for OAuth — user must click Authorize
        return;
      }
      connection.reconnect(serverUrl, currentAuthConfig);
    }
  }, [serverUrl, connection.reconnect, authType, currentAuthConfig]); // eslint-disable-line react-hooks/exhaustive-deps

  // OAuth flow handler (disabled in demo mode)
  const handleStartOAuth = React.useCallback(async () => {
    if (!serverUrl || demoMode) return;
    setOauthStatus('authorizing');
    setOauthError(undefined);

    // Open a blank popup immediately (synchronous, inside the click handler)
    // so browsers treat it as a user-initiated action and don't block it.
    // We'll navigate it to the auth URL after the server responds.
    const popup = window.open(
      'about:blank',
      `sunpeak-oauth-${Date.now()}`,
      'width=600,height=700,popup=yes'
    );

    try {
      const res = await fetch('/__sunpeak/oauth/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: serverUrl,
          scope: oauthScopes || undefined,
          clientId: oauthClientId || undefined,
          clientSecret: oauthClientSecret || undefined,
        }),
      });
      if (!res.ok) {
        let message = `OAuth start failed (${res.status})`;
        try {
          const json = await res.json();
          if (json.error) message = json.error;
        } catch {
          // Response wasn't JSON
        }
        throw new Error(message);
      }
      const data = await res.json();

      if (data.error) {
        popup?.close();
        setOauthError(data.error);
        setOauthStatus('error');
        return;
      }

      if (data.status === 'authorized') {
        // Already authorized (tokens were cached)
        popup?.close();
        setOauthStatus('authorized');
        connection.setConnected(data.simulations);
        return;
      }

      if (data.status === 'redirect' && data.authUrl) {
        // Navigate the pre-opened popup to the authorization URL.
        // If the popup was blocked, show an error.
        if (!popup || popup.closed) {
          setOauthError('Popup was blocked. Allow popups for this site and try again.');
          setOauthStatus('error');
          return;
        }
        popup.location.href = data.authUrl;

        // Listen for the popup's callback via two channels:
        // 1. postMessage — works when window.opener is available
        // 2. BroadcastChannel — fallback for OAuth providers that set
        //    Cross-Origin-Opener-Policy (COOP) which nullifies window.opener
        let checkClosed: ReturnType<typeof setInterval>;
        let bc: BroadcastChannel | undefined;
        const cleanup = () => {
          clearInterval(checkClosed);
          window.removeEventListener('message', handleMessage);
          bc?.close();
          oauthCleanupRef.current = undefined;
        };
        // Store cleanup so it runs on unmount if the popup is still open.
        oauthCleanupRef.current?.();
        oauthCleanupRef.current = cleanup;
        const handleOAuthResult = (result: Record<string, unknown>) => {
          cleanup();
          if (result.error) {
            setOauthError((result.errorDescription || result.error) as string);
            setOauthStatus('error');
          } else if (result.success) {
            setOauthStatus('authorized');
            connection.setConnected(result.simulations as Record<string, unknown> | undefined);
          }
        };
        // Channel 1: postMessage (origin-verified)
        const handleMessage = (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return;
          if (event.data?.type !== 'sunpeak-oauth-callback') return;
          handleOAuthResult(event.data);
        };
        window.addEventListener('message', handleMessage);
        // Channel 2: BroadcastChannel (same-origin by spec, no extra check needed)
        if (typeof BroadcastChannel !== 'undefined') {
          bc = new BroadcastChannel('sunpeak-oauth');
          bc.onmessage = (event) => {
            if (event.data?.type !== 'sunpeak-oauth-callback') return;
            handleOAuthResult(event.data);
          };
        }

        // Clean up if popup is closed without completing
        checkClosed = setInterval(() => {
          if (popup?.closed) {
            cleanup();
            // Only reset if still authorizing (not yet completed)
            setOauthStatus((prev) => (prev === 'authorizing' ? 'none' : prev));
          }
        }, 500);
      }
    } catch (err) {
      popup?.close();
      setOauthError(err instanceof Error ? err.message : String(err));
      setOauthStatus('error');
    }
  }, [serverUrl, oauthScopes, oauthClientId, oauthClientSecret, demoMode, connection]);

  // When reconnecting to a new server succeeds, update simulations.
  // Only clear on error after a user-initiated reconnect (URL change), not on the
  // initial health check — so prop-based simulations from fixture files survive
  // a server that happens to be unreachable on mount.
  React.useEffect(() => {
    if (connection.simulations) {
      setSimulations(connection.simulations as Record<string, Simulation>);
    } else if (connection.status === 'error' && connection.hasReconnected) {
      setSimulations({});
    }
  }, [connection.simulations, connection.status, connection.hasReconnected]);

  // Sync mock data based on the active simulation selection.
  // - "None" (null): clear toolResult so the "Press Run" empty state shows.
  // - Simulation selected: restore toolResult from the fixture. This handles the
  //   case where effectiveSimulationName didn't change (e.g., None → same fixture),
  //   so useInspectorState's internal sync wouldn't re-run.
  const { setToolResult, setToolResultJson, setToolResultError } = state;
  React.useEffect(() => {
    if (activeSimulationName === null) {
      setToolResult(undefined);
      setToolResultJson('');
      setToolResultError('');
    } else {
      const sim = simulations[activeSimulationName];
      const result = (sim?.toolResult as CallToolResult | undefined) ?? undefined;
      setToolResult(result);
      setToolResultJson(result ? JSON.stringify(result, null, 2) : '');
      setToolResultError('');
    }
  }, [
    activeSimulationName,
    effectiveSimulationName,
    simulations,
    setToolResult,
    setToolResultJson,
    setToolResultError,
  ]);

  // Reset hasRun and timing when tool or simulation changes.
  React.useEffect(() => {
    setHasRun(false);
  }, [effectiveSimulationName]);

  // Cleanup timers and OAuth listeners on unmount
  React.useEffect(
    () => () => {
      clearTimeout(checkTimerRef.current);
      oauthCleanupRef.current?.();
    },
    []
  );

  // Run button handler: call the real tool handler with current toolInput.
  // Uses currentSim (derived directly from simulations + effectiveSimulationName)
  // rather than state.selectedSim, which lags one render behind due to the
  // useEffect sync from effectiveSimulationName → state.setSelectedSimulationName.
  const handleRun = React.useCallback(async () => {
    const caller = onCallToolDirect ?? onCallTool;
    const sim = simulations[effectiveSimulationName];
    if (!caller || !sim) return;
    const toolName = sim.tool.name;
    setIsRunning(true);
    const startTime = performance.now();
    try {
      const result = await caller({ name: toolName, arguments: state.toolInput });
      const clientMs = Math.round((performance.now() - startTime) * 10) / 10;
      // Prefer server-reported timing (_meta._sunpeak.requestTimeMs) when available,
      // since it measures actual handler execution. Fall back to client round-trip
      // for non-sunpeak servers that don't include server-side timing.
      const resultMeta = (result as Record<string, unknown>)?._meta as
        | Record<string, unknown>
        | undefined;
      const serverMs = (resultMeta?._sunpeak as Record<string, unknown> | undefined)?.requestTimeMs;
      const durationMs = typeof serverMs === 'number' ? serverMs : clientMs;
      const resultWithTiming = {
        ...result,
        _meta: { ...resultMeta, _sunpeak: { requestTimeMs: durationMs } },
      };
      state.setToolResult(resultWithTiming);
      // Strip _sunpeak timing from the display JSON so the textarea shows the
      // clean result the app would receive. The server may include _meta._sunpeak.
      const displayResult = resultMeta?._sunpeak
        ? (() => {
            const { _sunpeak: _, ...cleanMeta } = resultMeta;
            const clean = { ...result } as Record<string, unknown>;
            clean._meta = Object.keys(cleanMeta).length > 0 ? cleanMeta : undefined;
            if (clean._meta === undefined) delete clean._meta;
            return clean;
          })()
        : result;
      state.setToolResultJson(JSON.stringify(displayResult, null, 2));
      state.setToolResultError('');
      setHasRun(true);
      setShowCheck(true);
      clearTimeout(checkTimerRef.current);
      checkTimerRef.current = setTimeout(() => setShowCheck(false), 2000);
    } catch (err) {
      const durationMs = Math.round((performance.now() - startTime) * 10) / 10;
      const message = err instanceof Error ? err.message : String(err);
      state.setToolResult({
        content: [{ type: 'text', text: `Error: ${message}` }],
        isError: true,
        _meta: { _sunpeak: { requestTimeMs: durationMs } },
      });
      state.setToolResultJson(
        JSON.stringify(
          { content: [{ type: 'text', text: `Error: ${message}` }], isError: true },
          null,
          2
        )
      );
      setHasRun(true);
    } finally {
      setIsRunning(false);
    }
  }, [onCallTool, onCallToolDirect, simulations, effectiveSimulationName, state]);

  // Resolve the active host shell
  const activeShell = getHostShell(state.activeHost);
  const registeredHosts = getRegisteredHosts();
  const ShellConversation = activeShell?.Conversation;

  // Merge host style variables, userAgent, and availableDisplayModes into hostContext.
  const hostContext = React.useMemo(() => {
    const styleVars = activeShell?.styleVariables;
    const userAgent = activeShell?.userAgent;
    const ctx = { ...state.hostContext };
    if (styleVars) {
      (ctx as McpUiHostContext).styles = { variables: styleVars };
    }
    if (userAgent) {
      (ctx as McpUiHostContext).userAgent = userAgent;
    }
    if (activeShell?.availableDisplayModes) {
      (ctx as McpUiHostContext).availableDisplayModes = activeShell.availableDisplayModes;
    }
    return ctx as McpUiHostContext;
  }, [state.hostContext, activeShell]);

  // Reset display mode to inline if the active host doesn't support it.
  const { displayMode, setDisplayMode } = state;
  React.useEffect(() => {
    const modes = activeShell?.availableDisplayModes;
    if (modes && !modes.includes(displayMode)) {
      setDisplayMode('inline');
    }
  }, [activeShell, displayMode, setDisplayMode]);

  // Apply host style variables to the document root.
  // Uses useLayoutEffect so variables are set BEFORE paint, preventing a flash
  // of stale colors when switching hosts and then toggling theme.
  React.useLayoutEffect(() => {
    const vars = activeShell?.styleVariables;
    if (!vars) return;
    const root = document.documentElement;
    for (const [key, value] of Object.entries(vars)) {
      if (value) root.style.setProperty(key, value);
    }
  }, [activeShell]);

  // Apply host page styles. Cleans up old properties when switching hosts.
  // Uses useLayoutEffect to stay in sync with style variables above.
  const prevPageStyleKeysRef = React.useRef<string[]>([]);
  React.useLayoutEffect(() => {
    const root = document.documentElement;
    for (const key of prevPageStyleKeysRef.current) {
      root.style.removeProperty(key);
    }
    const pageStyles = activeShell?.pageStyles;
    if (pageStyles) {
      const keys: string[] = [];
      for (const [key, value] of Object.entries(pageStyles)) {
        root.style.setProperty(key, value);
        keys.push(key);
      }
      prevPageStyleKeysRef.current = keys;
    } else {
      prevPageStyleKeysRef.current = [];
    }
  }, [activeShell]);

  // Inject host font CSS (@font-face rules) so the conversation chrome
  // uses the same font as the real host (e.g., Anthropic Sans for Claude).
  React.useLayoutEffect(() => {
    const fontCss = activeShell?.fontCss;
    const id = 'sunpeak-host-fonts';
    const existing = document.getElementById(id);
    if (!fontCss) {
      existing?.remove();
      return;
    }
    if (existing) {
      existing.textContent = fontCss;
    } else {
      const style = document.createElement('style');
      style.id = id;
      style.textContent = fontCss;
      document.head.appendChild(style);
    }
  }, [activeShell]);

  // Handle callServerTool from the iframe.
  // When a simulation is active: prefer serverTools mocks, fall back to MCP.
  // When "None": always use MCP (real handlers).
  // Uses simulations[activeSimulationName] directly rather than state.selectedSim,
  // which lags one render behind due to the useEffect sync.
  const handleCallTool = React.useCallback(
    (params: {
      name: string;
      arguments?: Record<string, unknown>;
    }): CallToolResult | Promise<CallToolResult> => {
      if (activeSimulationName) {
        const activeSim = simulations[activeSimulationName];
        const mock = activeSim?.serverTools?.[params.name];
        if (mock) {
          const result = resolveServerToolResult(mock, params.arguments);
          if (result) return result;
        }
      }
      if (onCallTool) {
        return onCallTool(params);
      }
      return {
        content: [
          {
            type: 'text',
            text: `[Inspector] Tool "${params.name}" called — no serverTools mock found in simulation "${effectiveSimulationName}".`,
          },
        ],
      };
    },
    [onCallTool, activeSimulationName, simulations, effectiveSimulationName]
  );

  // Derive user message for the conversation shell
  const userMessage = currentSim
    ? (currentSim.userMessage ??
      `Call my ${(currentSim.tool.title as string | undefined) || currentSim.tool.name} tool`)
    : undefined;

  // ── Prod resources ──
  const prodResourcesPath = React.useMemo(() => {
    if (!prodResources || !state.selectedSim?.resource) return undefined;
    const name = state.selectedSim.resource.name as string;
    return `/dist/${name}/${name}.html`;
  }, [prodResources, state.selectedSim?.resource]);

  const [prodResourcesReady, setProdResourcesReady] = React.useState(false);
  const [prodResourcesGeneration, setProdResourcesGeneration] = React.useState(0);
  const prodResourcesWasReady = React.useRef(false);
  React.useEffect(() => {
    if (!prodResourcesPath) {
      setProdResourcesReady(false);
      prodResourcesWasReady.current = false;
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const check = async () => {
      let ok = false;
      try {
        const res = await fetch(prodResourcesPath, { method: 'HEAD' });
        ok = res.ok;
      } catch {
        // network error → not ready
      }
      if (cancelled) return;
      if (ok) {
        if (!prodResourcesWasReady.current) {
          setProdResourcesGeneration((g) => g + 1);
        }
        prodResourcesWasReady.current = true;
        setProdResourcesReady(true);
      } else {
        prodResourcesWasReady.current = false;
        setProdResourcesReady(false);
      }
      timer = setTimeout(check, 1000);
    };

    check();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [prodResourcesPath]);

  const baseResourceUrl =
    (prodResourcesPath && prodResourcesReady ? prodResourcesPath : undefined) ?? state.resourceUrl;
  // Append devOverlay=false to the resource URL so the server can strip the overlay script
  const effectiveResourceUrl =
    baseResourceUrl && !showDevOverlay
      ? `${baseResourceUrl}${baseResourceUrl.includes('?') ? '&' : '?'}devOverlay=false`
      : baseResourceUrl;
  const prodResourcesLoading = !!prodResourcesPath && !prodResourcesReady;

  // ── Content rendering ──
  const hasTools = toolNames.length > 0;
  const hasMockData = activeSimulationName !== null && currentSim?.toolResult != null;
  const showEmptyState = !hasMockData && !hasRun;
  let content: React.ReactNode;
  const iframeBg = 'var(--sim-bg-conversation, var(--color-background-primary, transparent))';

  if (!hasTools) {
    const isConnected = connection.status === 'connected';
    const isError = connection.status === 'error';
    content = (
      <div
        className="h-full w-full flex items-center justify-center"
        style={{ background: iframeBg }}
      >
        <span
          className="text-sm text-center max-w-xs"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {isError
            ? 'Could not connect to MCP server'
            : isConnected
              ? 'No tools with UI resources found on this server'
              : serverUrl
                ? 'Connecting\u2026'
                : 'Enter an MCP server URL to get started'}
        </span>
      </div>
    );
  } else if (showEmptyState) {
    content = (
      <div
        className="h-full w-full flex items-center justify-center"
        style={{ background: iframeBg }}
      >
        <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Press <strong>Run</strong> to call the tool
        </span>
      </div>
    );
  } else if (prodResourcesLoading) {
    content = (
      <div
        className="h-full w-full flex items-center justify-center"
        style={{ background: iframeBg }}
      >
        <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Building&hellip;
        </span>
      </div>
    );
  } else if (effectiveResourceUrl) {
    content = (
      <div className="h-full w-full" style={{ background: iframeBg }}>
        <IframeResource
          key={`${state.activeHost}-${state.selectedSimulationName}-${effectiveResourceUrl}-${prodResources}-${prodResourcesGeneration}`}
          src={effectiveResourceUrl}
          hostContext={hostContext}
          toolInput={state.toolInput}
          toolResult={state.effectiveToolResult}
          hostOptions={{
            hostInfo: activeShell?.hostInfo,
            hostCapabilities: activeShell?.hostCapabilities,
            onDisplayModeChange: state.handleDisplayModeChange,
            onUpdateModelContext: state.handleUpdateModelContext,
            onCallTool: handleCallTool,
          }}
          permissions={state.permissions}
          prefersBorder={state.prefersBorder}
          onDisplayModeReady={state.handleDisplayModeReady}
          debugInjectState={state.modelContext}
          injectOpenAIRuntime={state.activeHost === 'chatgpt'}
          sandboxUrl={sandboxUrl}
          className="h-full w-full"
        />
      </div>
    );
  } else if (!prodResources && state.resourceScript) {
    content = (
      <div className="h-full w-full" style={{ background: iframeBg }}>
        <IframeResource
          key={`${state.activeHost}-${state.selectedSimulationName}-${state.resourceScript}`}
          scriptSrc={state.resourceScript}
          hostContext={hostContext}
          toolInput={state.toolInput}
          toolResult={state.effectiveToolResult}
          csp={state.csp}
          hostOptions={{
            hostInfo: activeShell?.hostInfo,
            hostCapabilities: activeShell?.hostCapabilities,
            onDisplayModeChange: state.handleDisplayModeChange,
            onUpdateModelContext: state.handleUpdateModelContext,
            onCallTool: handleCallTool,
          }}
          permissions={state.permissions}
          prefersBorder={state.prefersBorder}
          onDisplayModeReady={state.handleDisplayModeReady}
          debugInjectState={state.modelContext}
          injectOpenAIRuntime={state.activeHost === 'chatgpt'}
          sandboxUrl={sandboxUrl}
          className="h-full w-full"
        />
      </div>
    );
  } else {
    content = children;
  }

  // Use the active host's theme applier
  const applyTheme = activeShell?.applyTheme;

  // ── Run button (shown in conversation header when no simulation is active) ──
  // Visible when "None (call server)" is selected OR when no fixtures exist for the tool.
  // Hidden in demo mode to prevent sending real MCP requests from embedded contexts.
  const runButton =
    !demoMode && onCallTool && currentSim && activeSimulationName === null ? (
      <button
        type="button"
        onClick={handleRun}
        disabled={isRunning}
        className="rounded-full px-3 py-1 text-sm font-medium transition-opacity disabled:opacity-40 flex items-center gap-1.5 cursor-pointer"
        style={{
          backgroundColor: 'var(--color-text-primary)',
          color: 'var(--color-background-primary)',
        }}
      >
        {showCheck ? (
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2 6L5 9L10 3" />
          </svg>
        ) : (
          <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor">
            <path d="M0 0L10 6L0 12V0Z" />
          </svg>
        )}
        Run
      </button>
    ) : undefined;

  const conversationContent = ShellConversation ? (
    <ShellConversation
      screenWidth={state.screenWidth}
      displayMode={state.displayMode}
      platform={state.platform}
      onRequestDisplayMode={state.handleDisplayModeChange}
      appName={appName}
      appIcon={appIcon}
      userMessage={userMessage}
      onContentWidthChange={state.handleContentWidthChange}
      headerAction={runButton}
    >
      {content}
    </ShellConversation>
  ) : (
    content
  );

  if (!showSidebar) {
    return (
      <ThemeProvider theme={state.theme} applyTheme={applyTheme}>
        <div className="flex h-screen w-screen">{conversationContent}</div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={state.theme} applyTheme={applyTheme}>
      <SimpleSidebar
        controls={
          <div className="space-y-1">
            {/* ── MCP Server URL (always visible; read-only in demo mode) ── */}
            <SidebarControl
              label={
                <span className="flex items-center gap-1.5">
                  MCP Server
                  {serverUrl && !demoMode && (
                    <span
                      className="inline-block w-2 h-2 rounded-full"
                      data-testid="connection-status"
                      style={{
                        backgroundColor:
                          connection.status === 'connected'
                            ? '#22c55e'
                            : connection.status === 'connecting'
                              ? '#eab308'
                              : connection.status === 'error'
                                ? '#ef4444'
                                : '#6b7280',
                      }}
                      title={connection.error ?? connection.status}
                    />
                  )}
                </span>
              }
              tooltip="MCP server URL"
              data-testid="server-url"
            >
              <SidebarInput
                value={demoMode ? 'http://localhost:8000/mcp' : serverUrl}
                onChange={demoMode ? () => {} : setServerUrl}
                applyOnBlur
                placeholder="http://localhost:8000/mcp"
                disabled={demoMode}
              />
            </SidebarControl>

            {/* ── Authentication (hidden in demo mode) ── */}
            {!demoMode && (
              <SidebarCollapsibleControl
                key={`auth-${authType === 'none' ? 'none' : 'active'}`}
                label="Authentication"
                defaultCollapsed={authType === 'none'}
              >
                <div className="space-y-1">
                  <SidebarSelect
                    value={authType}
                    onChange={(value) => {
                      const newType = value as AuthType;
                      setAuthType(newType);
                      setOauthStatus('none');
                      setOauthError(undefined);
                      // Reconnect without auth when switching to "none"
                      if (newType === 'none' && serverUrl) {
                        connection.reconnect(serverUrl);
                      }
                    }}
                    options={[
                      { value: 'none', label: 'None' },
                      { value: 'bearer', label: 'Bearer Token' },
                      { value: 'oauth', label: 'OAuth' },
                    ]}
                  />

                  {authType === 'bearer' && (
                    <SidebarInput
                      type="password"
                      value={bearerToken}
                      onChange={(value) => {
                        setBearerToken(value);
                        // Reconnect with the new token when applied
                        if (serverUrl && value) {
                          connection.reconnect(serverUrl, { type: 'bearer', bearerToken: value });
                        }
                      }}
                      applyOnBlur
                      placeholder="Paste your token"
                    />
                  )}

                  {authType === 'oauth' && (
                    <div className="space-y-1">
                      <SidebarInput
                        value={oauthClientId}
                        onChange={setOauthClientId}
                        applyOnBlur
                        placeholder="Client ID (optional)"
                      />
                      {oauthClientId && (
                        <SidebarInput
                          type="password"
                          value={oauthClientSecret}
                          onChange={setOauthClientSecret}
                          applyOnBlur
                          placeholder="Client Secret (optional)"
                        />
                      )}
                      <SidebarInput
                        value={oauthScopes}
                        onChange={setOauthScopes}
                        applyOnBlur
                        placeholder="Scopes (optional)"
                      />
                      <button
                        type="button"
                        onClick={handleStartOAuth}
                        disabled={!serverUrl || oauthStatus === 'authorizing'}
                        className="w-full h-7 text-xs rounded-md px-2 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                          backgroundColor:
                            oauthStatus === 'authorized' ? '#22c55e' : 'var(--color-text-primary)',
                          color: 'var(--color-background-primary)',
                        }}
                      >
                        {oauthStatus === 'authorizing'
                          ? 'Authorizing\u2026'
                          : oauthStatus === 'authorized'
                            ? 'Authorized'
                            : 'Authorize'}
                      </button>
                      {oauthError && (
                        <div
                          className="text-[9px]"
                          style={{ color: 'var(--color-text-danger, #dc2626)' }}
                        >
                          {oauthError}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </SidebarCollapsibleControl>
            )}

            {/* ── Prod Resources (framework mode only, hidden in demo mode) ── */}
            {!hideInspectorModes && !demoMode && (
              <SidebarCheckbox
                checked={prodResources}
                onChange={setProdResources}
                label="Prod Resources"
                tooltip="Load resources from dist/ builds instead of HMR"
                docsPath="app-framework/cli/dev#prod-tools-and-prod-resources-flags"
              />
            )}

            {/* ── Tool + Simulation row ── */}
            {hasTools && (
              <div className="grid grid-cols-2 gap-2" data-testid="tool-simulation-row">
                <SidebarControl
                  label="Tool"
                  tooltip="Tool to inspect"
                  docsPath="app-framework/cli/dev"
                  data-testid="tool-selector"
                >
                  <SidebarSelect
                    value={selectedToolName}
                    onChange={(value) => setSelectedToolName(value)}
                    options={toolNames.map((name) => {
                      const info = toolMap.get(name)!;
                      return {
                        value: name,
                        label: (info.tool.title as string | undefined) || name,
                      };
                    })}
                  />
                </SidebarControl>
                <SidebarControl
                  label={
                    selectedToolInfo && selectedToolInfo.fixtureSimNames.length > 0 ? (
                      'Simulation'
                    ) : (
                      <a
                        href={`${DOCS_BASE_URL}/testing/simulations`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="no-underline transition-colors"
                        style={{ color: 'var(--color-text-secondary)' }}
                        onMouseEnter={(e) => {
                          (e.target as HTMLElement).style.color = 'var(--color-text-primary)';
                        }}
                        onMouseLeave={(e) => {
                          (e.target as HTMLElement).style.color = 'var(--color-text-secondary)';
                        }}
                      >
                        Simulation
                      </a>
                    )
                  }
                  tooltip={
                    selectedToolInfo && selectedToolInfo.fixtureSimNames.length > 0
                      ? 'Test fixture with mock data'
                      : 'Create simulations for faster testing'
                  }
                  docsPath="testing/simulations"
                  data-testid="simulation-selector"
                >
                  <SidebarSelect
                    value={activeSimulationName ?? '__none__'}
                    onChange={(value) =>
                      setActiveSimulationName(value === '__none__' ? null : value)
                    }
                    options={[
                      ...(demoMode
                        ? []
                        : [
                            {
                              value: '__none__',
                              label:
                                selectedToolInfo && selectedToolInfo.fixtureSimNames.length > 0
                                  ? 'None (call server)'
                                  : 'None',
                            },
                          ]),
                      ...(selectedToolInfo?.fixtureSimNames ?? []).map((simName) => ({
                        value: simName,
                        label: simName,
                      })),
                    ]}
                  />
                </SidebarControl>
              </div>
            )}

            {/* ── Host + Width row ── */}
            <div className="grid grid-cols-2 gap-2">
              {registeredHosts.length > 1 && (
                <SidebarControl
                  label="Host"
                  tooltip="Host runtime to simulate"
                  docsPath="app-framework/functions/host-detection"
                >
                  <SidebarSelect
                    value={state.activeHost}
                    onChange={(value) => state.setActiveHost(value as HostId)}
                    options={registeredHosts.map((h) => ({
                      value: h.id,
                      label: h.label,
                    }))}
                  />
                </SidebarControl>
              )}
              <SidebarControl label="Width" tooltip="Chat width" docsPath="testing/inspector">
                <SidebarSelect
                  value={state.screenWidth}
                  onChange={(value) => state.setScreenWidth(value as ScreenWidth)}
                  options={[
                    { value: 'mobile-s', label: 'Mobile S (375px)' },
                    { value: 'mobile-l', label: 'Mobile L (425px)' },
                    { value: 'tablet', label: 'Tablet (768px)' },
                    { value: 'full', label: '100% (Full)' },
                  ]}
                />
              </SidebarControl>
            </div>

            <SidebarCollapsibleControl
              label="Host Context"
              defaultCollapsed={false}
              tooltip="Host-provided environment"
              docsPath="app-framework/hooks/use-host-context"
            >
              <div className="space-y-1">
                <div className="grid grid-cols-[2fr_1fr] gap-2">
                  <SidebarControl
                    label="Theme"
                    tooltip="Host color theme"
                    docsPath="app-framework/hooks/use-theme"
                  >
                    <SidebarToggle
                      value={state.theme}
                      onChange={(value) => state.setTheme(value as McpUiTheme)}
                      options={[
                        { value: 'light', label: 'Light' },
                        { value: 'dark', label: 'Dark' },
                      ]}
                    />
                  </SidebarControl>

                  <SidebarControl
                    label="Locale"
                    tooltip="BCP 47 language tag"
                    docsPath="app-framework/hooks/use-locale"
                  >
                    <SidebarInput
                      applyOnBlur
                      value={state.locale}
                      onChange={(value) => state.setLocale(value)}
                      placeholder="en-US"
                    />
                  </SidebarControl>
                </div>

                <SidebarControl
                  label="Display Mode"
                  tooltip="Host resource rendering paradigm"
                  docsPath="app-framework/hooks/use-display-mode"
                >
                  <SidebarToggle
                    value={state.displayMode}
                    onChange={(value) => state.setDisplayMode(value as McpUiDisplayMode)}
                    options={[
                      { value: 'inline', label: 'Inline' },
                      { value: 'pip', label: 'PiP' },
                      { value: 'fullscreen', label: 'Full' },
                    ].filter(
                      (opt) =>
                        !activeShell?.availableDisplayModes ||
                        activeShell.availableDisplayModes.includes(opt.value as McpUiDisplayMode)
                    )}
                  />
                </SidebarControl>

                <div className="grid grid-cols-7 gap-2">
                  <div className="col-span-3">
                    <SidebarControl
                      label="Platform"
                      tooltip="End user device platform"
                      docsPath="app-framework/hooks/use-platform"
                    >
                      <SidebarSelect
                        value={state.platform}
                        onChange={(value) => {
                          const p = value as Platform;
                          state.setPlatform(p);
                          if (p === 'mobile') {
                            state.setHover(false);
                            state.setTouch(true);
                          } else if (p === 'desktop') {
                            state.setHover(true);
                            state.setTouch(false);
                          } else {
                            state.setHover(true);
                            state.setTouch(false);
                          }
                        }}
                        options={[
                          { value: 'mobile', label: 'Mobile' },
                          { value: 'desktop', label: 'Desktop' },
                          { value: 'web', label: 'Web' },
                        ]}
                      />
                    </SidebarControl>
                  </div>

                  <div className="col-span-4">
                    <SidebarControl
                      label="Capabilities"
                      tooltip="End user device capabilities"
                      docsPath="app-framework/hooks/use-device-capabilities"
                    >
                      <div className="flex gap-2">
                        <SidebarCheckbox
                          checked={state.hover}
                          onChange={state.setHover}
                          label="Hover"
                        />
                        <SidebarCheckbox
                          checked={state.touch}
                          onChange={state.setTouch}
                          label="Touch"
                        />
                      </div>
                    </SidebarControl>
                  </div>
                </div>

                <SidebarControl
                  label="Time Zone"
                  tooltip="End user IANA time zone"
                  docsPath="app-framework/hooks/use-time-zone"
                >
                  <SidebarInput
                    applyOnBlur
                    value={state.timeZone}
                    onChange={(value) => state.setTimeZone(value)}
                    placeholder="e.g. America/New_York"
                  />
                </SidebarControl>

                <SidebarControl
                  label="Container Dimensions"
                  tooltip="Host-enforced size constraints (px)"
                  docsPath="app-framework/hooks/use-viewport"
                >
                  <div className="grid grid-cols-4 gap-1">
                    <SidebarControl label="Height">
                      <SidebarInput
                        type="number"
                        applyOnBlur
                        placeholder="-"
                        value={state.containerHeight != null ? String(state.containerHeight) : ''}
                        onChange={(value) =>
                          state.setContainerHeight(value ? Number(value) : undefined)
                        }
                      />
                    </SidebarControl>
                    <SidebarControl label="Width">
                      <SidebarInput
                        type="number"
                        applyOnBlur
                        placeholder="-"
                        value={state.containerWidth != null ? String(state.containerWidth) : ''}
                        onChange={(value) =>
                          state.setContainerWidth(value ? Number(value) : undefined)
                        }
                      />
                    </SidebarControl>
                    <SidebarControl label="Max H">
                      <SidebarInput
                        type="number"
                        applyOnBlur
                        placeholder="-"
                        value={
                          state.containerMaxHeight != null ? String(state.containerMaxHeight) : ''
                        }
                        onChange={(value) =>
                          state.setContainerMaxHeight(value ? Number(value) : undefined)
                        }
                      />
                    </SidebarControl>
                    <SidebarControl label="Max W">
                      <SidebarInput
                        type="number"
                        applyOnBlur
                        placeholder={
                          state.measuredContentWidth != null
                            ? String(state.measuredContentWidth)
                            : '-'
                        }
                        value={
                          state.containerMaxWidth != null ? String(state.containerMaxWidth) : ''
                        }
                        onChange={(value) =>
                          state.setContainerMaxWidth(value ? Number(value) : undefined)
                        }
                      />
                    </SidebarControl>
                  </div>
                </SidebarControl>

                <SidebarControl
                  label="Safe Area Insets"
                  tooltip="Device safe area padding (px)"
                  docsPath="app-framework/hooks/use-safe-area"
                >
                  <div className="grid grid-cols-4 gap-1">
                    <div className="flex items-center gap-0.5">
                      <span
                        className="text-[10px]"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        &uarr;
                      </span>
                      <SidebarInput
                        type="number"
                        applyOnBlur
                        placeholder="-"
                        value={state.safeAreaInsets.top ? String(state.safeAreaInsets.top) : ''}
                        onChange={(value) =>
                          state.setSafeAreaInsets((prev) => ({ ...prev, top: Number(value) || 0 }))
                        }
                      />
                    </div>
                    <div className="flex items-center gap-0.5">
                      <span
                        className="text-[10px]"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        &darr;
                      </span>
                      <SidebarInput
                        type="number"
                        applyOnBlur
                        placeholder="-"
                        value={
                          state.safeAreaInsets.bottom ? String(state.safeAreaInsets.bottom) : ''
                        }
                        onChange={(value) =>
                          state.setSafeAreaInsets((prev) => ({
                            ...prev,
                            bottom: Number(value) || 0,
                          }))
                        }
                      />
                    </div>
                    <div className="flex items-center gap-0.5">
                      <span
                        className="text-[10px]"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        &larr;
                      </span>
                      <SidebarInput
                        type="number"
                        applyOnBlur
                        placeholder="-"
                        value={state.safeAreaInsets.left ? String(state.safeAreaInsets.left) : ''}
                        onChange={(value) =>
                          state.setSafeAreaInsets((prev) => ({ ...prev, left: Number(value) || 0 }))
                        }
                      />
                    </div>
                    <div className="flex items-center gap-0.5">
                      <span
                        className="text-[10px]"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        &rarr;
                      </span>
                      <SidebarInput
                        type="number"
                        applyOnBlur
                        placeholder="-"
                        value={state.safeAreaInsets.right ? String(state.safeAreaInsets.right) : ''}
                        onChange={(value) =>
                          state.setSafeAreaInsets((prev) => ({
                            ...prev,
                            right: Number(value) || 0,
                          }))
                        }
                      />
                    </div>
                  </div>
                </SidebarControl>
              </div>
            </SidebarCollapsibleControl>

            <SidebarCollapsibleControl
              label="App Context"
              defaultCollapsed
              tooltip="App-provided context shared with the model"
              docsPath="app-framework/hooks/use-app-state"
            >
              <SidebarTextarea
                value={state.modelContextJson}
                onChange={(json) =>
                  state.validateJSON(json, state.setModelContextJson, state.setModelContextError)
                }
                onFocus={() => state.setEditingField('modelContext')}
                onBlur={() =>
                  state.commitJSON(state.modelContextJson, state.setModelContextError, (parsed) => {
                    state.setModelContext(parsed as Record<string, unknown> | null);
                  })
                }
                error={state.modelContextError}
                maxRows={8}
              />
            </SidebarCollapsibleControl>

            <SidebarCollapsibleControl
              label="Tool Input (JSON)"
              defaultCollapsed={false}
              tooltip="Arguments passed to the tool"
              docsPath="app-framework/hooks/use-tool-data"
            >
              <SidebarTextarea
                value={state.toolInputJson}
                onChange={(json) =>
                  state.validateJSON(json, state.setToolInputJson, state.setToolInputError)
                }
                onFocus={() => state.setEditingField('toolInput')}
                onBlur={() =>
                  state.commitJSON(state.toolInputJson, state.setToolInputError, (parsed) =>
                    state.setToolInput((parsed as Record<string, unknown>) ?? {})
                  )
                }
                error={state.toolInputError}
                maxRows={8}
              />
            </SidebarCollapsibleControl>

            <SidebarCollapsibleControl
              label="Tool Result (JSON)"
              defaultCollapsed={false}
              tooltip="Structured content returned by the tool"
              docsPath="app-framework/hooks/use-tool-data"
              data-testid="tool-result-section"
            >
              <SidebarTextarea
                value={state.toolResultJson}
                data-testid="tool-result-textarea"
                onChange={(json) =>
                  state.validateJSON(json, state.setToolResultJson, state.setToolResultError)
                }
                onFocus={() => state.setEditingField('toolResult')}
                onBlur={() =>
                  state.commitJSON(state.toolResultJson, state.setToolResultError, (parsed) => {
                    if (parsed === null) {
                      state.setToolResult(undefined);
                    } else {
                      const result = parsed as Record<string, unknown>;
                      if ('content' in result || 'structuredContent' in result) {
                        state.setToolResult(
                          result as import('@modelcontextprotocol/sdk/types.js').CallToolResult
                        );
                      } else {
                        state.setToolResult({ content: [], structuredContent: result });
                      }
                    }
                  })
                }
                error={state.toolResultError}
                maxRows={8}
              />
            </SidebarCollapsibleControl>
          </div>
        }
      >
        {conversationContent}
      </SimpleSidebar>
    </ThemeProvider>
  );
}
