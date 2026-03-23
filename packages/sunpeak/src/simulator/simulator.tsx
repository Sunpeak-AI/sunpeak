import * as React from 'react';
import type {
  McpUiDisplayMode,
  McpUiTheme,
  McpUiHostContext,
} from '@modelcontextprotocol/ext-apps';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { useSimulatorState } from './use-simulator-state';
import { useMcpConnection } from './use-mcp-connection';
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
import type { ScreenWidth } from './simulator-types';

// Register built-in host shells. These imports live here (in the component file)
// rather than in the barrel index.ts because Rollup code-splitting can separate
// side-effect imports from barrel exports, letting consumer bundlers tree-shake
// them. Importing here makes registration part of the Simulator component's
// dependency graph, which can't be tree-shaken since the component is used.
import '../chatgpt/chatgpt-host';
import '../claude/claude-host';

export interface SimulatorProps {
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
  /** Direct tool handler call, bypassing MCP server mock data. Used by the Prod Tools Run button to call real handlers. Falls back to onCallTool if not provided. */
  onCallToolDirect?: (params: {
    name: string;
    arguments?: Record<string, unknown>;
  }) => Promise<CallToolResult> | CallToolResult;
  /** Initial prod-tools mode state. Defaults to false. */
  defaultProdTools?: boolean;
  /** Initial prod-resources mode state. When true, resources load from dist/ instead of HMR. Defaults to false. */
  defaultProdResources?: boolean;
  /** Hide Prod Tools and Prod Resources toggles in the sidebar (e.g., for marketing/embedded use). */
  hideSimulatorModes?: boolean;
  /**
   * Base URL of the separate-origin sandbox server (e.g., "http://localhost:24680").
   * When provided, the outer iframe loads from this URL instead of using srcdoc,
   * giving real cross-origin isolation that matches production hosts.
   */
  sandboxUrl?: string;
  /**
   * MCP server URL. When provided, the simulator enters "inspect" mode:
   * shows a server URL input in the sidebar (replacing prod-tools/prod-resources
   * checkboxes), routes tool calls to the real server, and always shows the
   * Run button. Simulations still work — those with toolResult use mock data,
   * those without call the real server.
   */
  mcpServerUrl?: string;
}

type Platform = 'mobile' | 'desktop' | 'web';

export function Simulator({
  children,
  simulations = {},
  appName = 'Sunpeak',
  appIcon,
  defaultHost = 'chatgpt',
  onCallTool,
  onCallToolDirect,
  defaultProdTools = false,
  defaultProdResources = false,
  hideSimulatorModes = false,
  sandboxUrl,
  mcpServerUrl,
}: SimulatorProps) {
  const isInspectMode = mcpServerUrl != null;
  const state = useSimulatorState({ simulations, defaultHost });
  const connection = useMcpConnection(mcpServerUrl);
  const [prodTools, setProdTools] = React.useState(
    isInspectMode ? true : (state.urlProdTools ?? defaultProdTools)
  );
  const [prodResources, setProdResources] = React.useState(
    state.urlProdResources ?? defaultProdResources
  );
  const [isRunning, setIsRunning] = React.useState(false);
  const [hasRun, setHasRun] = React.useState(false);
  const [showCheck, setShowCheck] = React.useState(false);
  const checkTimerRef = React.useRef<ReturnType<typeof setTimeout>>(undefined);

  // Reset hasRun when tool selection changes in prod-tools mode.
  // When switching back to simulation mode, restore the simulation's tool result.
  React.useEffect(() => {
    if (prodTools) {
      setHasRun(false);
      state.setToolResult(undefined);
      state.setToolResultJson('');
      state.setToolResultError('');
    } else {
      const simResult = (state.selectedSim?.toolResult as CallToolResult | undefined) ?? undefined;
      state.setToolResult(simResult);
    }
  }, [prodTools, state.selectedSimulationName]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup check timer
  React.useEffect(() => () => clearTimeout(checkTimerRef.current), []);

  // In prod-tools mode, deduplicate simulations by tool name for the Tool dropdown
  const toolOptions = React.useMemo(() => {
    if (!prodTools) return [];
    const seen = new Map<string, string>(); // toolName → first simulationName
    for (const simName of state.simulationNames) {
      const sim = simulations[simName];
      const toolName = sim.tool.name;
      if (!seen.has(toolName)) {
        seen.set(toolName, simName);
      }
    }
    return Array.from(seen.entries()).map(([toolName, simName]) => ({
      value: simName,
      label: (simulations[simName].tool.title as string | undefined) || toolName,
    }));
  }, [prodTools, state.simulationNames, simulations]);

  // Run button handler: call the real tool handler with current toolInput.
  // Uses onCallToolDirect (bypasses MCP mock data) so the real handler runs.
  // Falls back to onCallTool if no direct handler is available.
  // In inspect mode, if the simulation has a pre-filled toolResult, use it
  // directly (mock mode) instead of calling the real server.
  const handleRun = React.useCallback(async () => {
    const caller = onCallToolDirect ?? onCallTool;
    if (!caller || !state.selectedSim) return;
    const toolName = state.selectedSim.tool.name;
    setIsRunning(true);
    try {
      // Use simulation's pre-filled toolResult as a mock when available in inspect mode
      const simToolResult = isInspectMode
        ? (state.selectedSim.toolResult as CallToolResult | undefined)
        : undefined;
      const result =
        simToolResult ?? (await caller({ name: toolName, arguments: state.toolInput }));
      state.setToolResult(result);
      state.setToolResultJson(JSON.stringify(result, null, 2));
      state.setToolResultError('');
      setHasRun(true);
      setShowCheck(true);
      clearTimeout(checkTimerRef.current);
      checkTimerRef.current = setTimeout(() => setShowCheck(false), 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      state.setToolResult({
        content: [{ type: 'text', text: `Error: ${message}` }],
        isError: true,
      });
      state.setToolResultJson(
        JSON.stringify(
          { content: [{ type: 'text', text: `Error: ${message}` }], isError: true },
          null,
          2
        )
      );
    } finally {
      setIsRunning(false);
    }
  }, [onCallTool, onCallToolDirect, state, isInspectMode]);

  // Resolve the active host shell
  const activeShell = getHostShell(state.activeHost);
  const registeredHosts = getRegisteredHosts();
  const ShellConversation = activeShell?.Conversation;

  // Merge host style variables and userAgent into the hostContext.
  // Style variables use CSS light-dark() so they don't depend on theme —
  // the app handles theme via color-scheme set by applyDocumentTheme().
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
    return ctx as McpUiHostContext;
  }, [state.hostContext, activeShell]);

  // Apply host style variables to the document root so the simulator chrome
  // (sidebar, conversation shells) can use them via var(--color-*).
  // These are the same MCP standard variables sent to the iframe.
  React.useEffect(() => {
    const vars = activeShell?.styleVariables;
    if (!vars) return;
    const root = document.documentElement;
    for (const [key, value] of Object.entries(vars)) {
      if (value) root.style.setProperty(key, value);
    }
  }, [activeShell]);

  // Apply host page styles (simulator chrome backgrounds, etc.) to the document root.
  // Cleans up old properties when switching hosts so stale values don't persist.
  const prevPageStyleKeysRef = React.useRef<string[]>([]);
  React.useEffect(() => {
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

  // Handle callServerTool from the iframe.
  // In simulation mode: prefer serverTools mocks from the fixture, fall back to onCallTool (MCP).
  // In prod-tools mode: always use onCallTool (MCP → real handlers).
  const handleCallTool = React.useCallback(
    (params: {
      name: string;
      arguments?: Record<string, unknown>;
    }): CallToolResult | Promise<CallToolResult> => {
      // In simulation mode, try serverTools mocks first
      if (!prodTools) {
        const mock = state.selectedSim?.serverTools?.[params.name];
        if (mock) {
          const result = resolveServerToolResult(mock, params.arguments);
          if (result) return result;
        }
      }
      // Forward to MCP server (real handlers for backend tools)
      if (onCallTool) {
        return onCallTool(params);
      }
      return {
        content: [
          {
            type: 'text',
            text: `[Simulator] Tool "${params.name}" called — no serverTools mock found in simulation "${state.selectedSimulationName}".`,
          },
        ],
      };
    },
    [onCallTool, prodTools, state.selectedSim, state.selectedSimulationName]
  );

  // In prod-tools mode, derive user message from the selected tool
  const prodToolsUserMessage =
    prodTools && state.selectedSim
      ? `Call my ${(state.selectedSim.tool.title as string | undefined) || state.selectedSim.tool.name} tool`
      : undefined;

  // When prod-resources mode is on, override the resource URL to point at dist/ HTML.
  // The resource name comes from the simulation's resource metadata.
  // We verify the dist file exists via a HEAD request to avoid loading the
  // dev server's SPA fallback (which would render a nested simulator).
  const prodResourcesPath = React.useMemo(() => {
    if (!prodResources || !state.selectedSim?.resource) return undefined;
    const name = state.selectedSim.resource.name as string;
    return `/dist/${name}/${name}.html`;
  }, [prodResources, state.selectedSim?.resource]);

  // Continuously poll the dist file while prod-resources mode is active.
  // Detects file disappearing (rebuild started → "Building…") and
  // reappearing (rebuild finished → load iframe). A generation counter
  // increments on each ready transition to force an iframe remount.
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
          // Transition: not ready → ready. Bump generation to remount iframe.
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

  const effectiveResourceUrl =
    (prodResourcesPath && prodResourcesReady ? prodResourcesPath : undefined) ?? state.resourceUrl;
  const prodResourcesLoading = !!prodResourcesPath && !prodResourcesReady;

  // Build content.
  // The wrapper div stays mounted across key changes, providing a themed
  // background while the iframe (opacity: 0) loads new content.
  // In prod-tools mode, show empty state until the tool has been run.
  const showEmptyState = prodTools && !hasRun;
  let content: React.ReactNode;
  const iframeBg = 'var(--sim-bg-conversation, var(--color-background-primary, transparent))';
  if (showEmptyState) {
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
          key={`${state.activeHost}-${state.selectedSimulationName}-${prodResources}-${prodResourcesGeneration}`}
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
          key={`${state.activeHost}-${state.selectedSimulationName}`}
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

  return (
    <ThemeProvider theme={state.theme} applyTheme={applyTheme}>
      <SimpleSidebar
        controls={
          <div className="space-y-1">
            {/* ── Inspect mode: Server URL ── */}
            {isInspectMode && (
              <SidebarControl
                label={
                  <span className="flex items-center gap-1.5">
                    MCP Server
                    <span
                      className="inline-block w-2 h-2 rounded-full"
                      data-testid="inspect-connection-status"
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
                  </span>
                }
                tooltip="MCP server URL (set via --server flag)"
                data-testid="inspect-server-url"
              >
                <SidebarInput
                  value={mcpServerUrl ?? ''}
                  onChange={() => {}}
                  disabled
                  placeholder="http://localhost:8000/mcp"
                />
              </SidebarControl>
            )}

            {/* ── Dev mode toggles (framework mode only) ── */}
            {!isInspectMode && !hideSimulatorModes && onCallTool && (
              <SidebarCheckbox
                checked={prodTools}
                onChange={setProdTools}
                label="Prod Tools"
                tooltip="Use real tool handlers instead of simulations"
                docsPath="api-reference/cli/dev#prod-tools-and-prod-resources-flags"
              />
            )}
            {!isInspectMode && !hideSimulatorModes && (
              <SidebarCheckbox
                checked={prodResources}
                onChange={setProdResources}
                label="Prod Resources"
                tooltip="Load resources from dist/ builds instead of HMR"
                docsPath="api-reference/cli/dev#prod-tools-and-prod-resources-flags"
              />
            )}

            {/* ── Host + Width row ── */}
            <div className="grid grid-cols-2 gap-2">
              {registeredHosts.length > 1 && (
                <SidebarControl
                  label="Host"
                  tooltip="Host runtime to simulate"
                  docsPath="api-reference/functions/host-detection"
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
              <SidebarControl
                label="Width"
                tooltip="Chat width"
                docsPath="api-reference/simulations/simulator"
              >
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

            {/* ── Tool / Simulation selector ── */}
            {prodTools && toolOptions.length > 1 && (
              <SidebarControl
                label="Tool"
                tooltip="Tool to call with prod handler"
                docsPath="api-reference/cli/dev"
              >
                <SidebarSelect
                  value={state.selectedSimulationName}
                  onChange={(value) => state.setSelectedSimulationName(value)}
                  options={toolOptions}
                />
              </SidebarControl>
            )}
            {!prodTools && state.simulationNames.length > 1 && (
              <SidebarControl
                label="Simulation"
                tooltip="Test fixture to render"
                docsPath="api-reference/simulations/simulation"
              >
                <SidebarSelect
                  value={state.selectedSimulationName}
                  onChange={(value) => state.setSelectedSimulationName(value)}
                  options={state.simulationNames.map((name) => {
                    const sim = simulations[name];
                    const resourceTitle = sim.resource
                      ? (sim.resource.title as string | undefined) || sim.resource.name
                      : undefined;
                    const toolTitle = (sim.tool.title as string | undefined) || sim.tool.name;
                    return {
                      value: name,
                      label: resourceTitle ? `${resourceTitle}: ${toolTitle}` : toolTitle,
                    };
                  })}
                />
              </SidebarControl>
            )}

            <SidebarCollapsibleControl
              label="Host Context"
              defaultCollapsed={false}
              tooltip="Host-provided environment"
              docsPath="api-reference/hooks/use-host-context"
            >
              <div className="space-y-1">
                <div className="grid grid-cols-[2fr_1fr] gap-2">
                  <SidebarControl
                    label="Theme"
                    tooltip="Host color theme"
                    docsPath="api-reference/hooks/use-theme"
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
                    docsPath="api-reference/hooks/use-locale"
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
                  docsPath="api-reference/hooks/use-display-mode"
                >
                  <SidebarToggle
                    value={state.displayMode}
                    onChange={(value) => state.setDisplayMode(value as McpUiDisplayMode)}
                    options={[
                      { value: 'inline', label: 'Inline' },
                      { value: 'pip', label: 'PiP' },
                      { value: 'fullscreen', label: 'Full' },
                    ]}
                  />
                </SidebarControl>

                <div className="grid grid-cols-7 gap-2">
                  <div className="col-span-3">
                    <SidebarControl
                      label="Platform"
                      tooltip="End user device platform"
                      docsPath="api-reference/hooks/use-platform"
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
                      docsPath="api-reference/hooks/use-device-capabilities"
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
                  docsPath="api-reference/hooks/use-time-zone"
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
                  docsPath="api-reference/hooks/use-viewport"
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
                  docsPath="api-reference/hooks/use-safe-area"
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
              docsPath="api-reference/hooks/use-app-state"
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
              key={`tool-input-${prodTools}`}
              label="Tool Input (JSON)"
              defaultCollapsed={!prodTools}
              tooltip="Arguments passed to the tool"
              docsPath="api-reference/hooks/use-tool-data"
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
              key={`tool-result-${prodTools}`}
              label="Tool Result (JSON)"
              defaultCollapsed={prodTools}
              tooltip="Structured content returned by the tool"
              docsPath="api-reference/hooks/use-tool-data"
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
        {ShellConversation ? (
          <ShellConversation
            screenWidth={state.screenWidth}
            displayMode={state.displayMode}
            platform={state.platform}
            onRequestDisplayMode={state.handleDisplayModeChange}
            appName={appName}
            appIcon={appIcon}
            userMessage={prodToolsUserMessage ?? state.selectedSim?.userMessage}
            onContentWidthChange={state.handleContentWidthChange}
            headerAction={
              prodTools && onCallTool ? (
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
              ) : undefined
            }
          >
            {content}
          </ShellConversation>
        ) : (
          content
        )}
      </SimpleSidebar>
    </ThemeProvider>
  );
}
