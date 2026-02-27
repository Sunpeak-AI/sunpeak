import * as React from 'react';
import type {
  McpUiDisplayMode,
  McpUiTheme,
  McpUiHostContext,
} from '@modelcontextprotocol/ext-apps';
import { useSimulatorState } from './use-simulator-state';
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
}

type Platform = 'mobile' | 'desktop' | 'web';

export function Simulator({
  children,
  simulations = {},
  appName = 'Sunpeak',
  appIcon,
  defaultHost = 'chatgpt',
}: SimulatorProps) {
  const state = useSimulatorState({ simulations, defaultHost });

  // Resolve the active host shell
  const activeShell = getHostShell(state.activeHost);
  const registeredHosts = getRegisteredHosts();
  const ShellConversation = activeShell?.Conversation;

  // Merge host style variables into the hostContext (standard MCP App theming).
  // Style variables use CSS light-dark() so they don't depend on theme —
  // the app handles theme via color-scheme set by applyDocumentTheme().
  const hostContext = React.useMemo(() => {
    const styleVars = activeShell?.styleVariables;
    if (!styleVars) return state.hostContext;
    return {
      ...state.hostContext,
      styles: { variables: styleVars },
    } as McpUiHostContext;
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

  // Build content
  let content: React.ReactNode;
  if (state.resourceUrl) {
    content = (
      <IframeResource
        src={state.resourceUrl}
        hostContext={hostContext}
        toolInput={state.toolInput}
        toolInputPartial={state.toolInputPartial}
        toolResult={state.effectiveToolResult}
        hostOptions={{
          hostInfo: activeShell?.hostInfo,
          hostCapabilities: activeShell?.hostCapabilities,
          onDisplayModeChange: state.handleDisplayModeChange,
          onUpdateModelContext: state.handleUpdateModelContext,
        }}
        permissions={state.permissions}
        prefersBorder={state.prefersBorder}
        onDisplayModeReady={state.handleDisplayModeReady}
        debugInjectState={state.modelContext}
        injectOpenAIRuntime={state.activeHost === 'chatgpt'}
        className="h-full w-full"
      />
    );
  } else if (state.resourceScript) {
    content = (
      <IframeResource
        scriptSrc={state.resourceScript}
        hostContext={hostContext}
        toolInput={state.toolInput}
        toolInputPartial={state.toolInputPartial}
        toolResult={state.effectiveToolResult}
        csp={state.csp}
        hostOptions={{
          hostInfo: activeShell?.hostInfo,
          hostCapabilities: activeShell?.hostCapabilities,
          onDisplayModeChange: state.handleDisplayModeChange,
          onUpdateModelContext: state.handleUpdateModelContext,
        }}
        permissions={state.permissions}
        prefersBorder={state.prefersBorder}
        onDisplayModeReady={state.handleDisplayModeReady}
        debugInjectState={state.modelContext}
        injectOpenAIRuntime={state.activeHost === 'chatgpt'}
        className="h-full w-full"
      />
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
          <div className="space-y-2">
            {/* ── Host selector ── */}
            {registeredHosts.length > 1 && (
              <SidebarControl label="Host">
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

            {/* ── Simulation selector ── */}
            {state.simulationNames.length > 1 && (
              <SidebarControl label="Simulation">
                <SidebarSelect
                  value={state.selectedSimulationName}
                  onChange={(value) => state.setSelectedSimulationName(value)}
                  options={state.simulationNames.map((name) => {
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

            <SidebarCollapsibleControl label="Host Context" defaultCollapsed={false}>
              <div className="space-y-2">
                <SidebarControl label="Theme">
                  <SidebarToggle
                    value={state.theme}
                    onChange={(value) => state.setTheme(value as McpUiTheme)}
                    options={[
                      { value: 'light', label: 'Light' },
                      { value: 'dark', label: 'Dark' },
                    ]}
                  />
                </SidebarControl>

                <SidebarControl label="Display Mode">
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

                <div className="grid grid-cols-2 gap-2">
                  <SidebarControl label="Locale">
                    <SidebarInput
                      value={state.locale}
                      onChange={(value) => state.setLocale(value)}
                      placeholder="e.g. en-US"
                    />
                  </SidebarControl>

                  <SidebarControl label="Max Height (PiP)">
                    <SidebarInput
                      type="number"
                      value={
                        state.displayMode === 'pip' && state.containerMaxHeight !== undefined
                          ? String(state.containerMaxHeight)
                          : ''
                      }
                      onChange={(value) => {
                        if (state.displayMode === 'pip') {
                          state.setContainerMaxHeight(value ? Number(value) : 480);
                        }
                      }}
                      placeholder={state.displayMode === 'pip' ? '480' : '-'}
                      disabled={state.displayMode !== 'pip'}
                    />
                  </SidebarControl>
                </div>

                <SidebarControl label="Platform">
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

                <div className="pl-4">
                  <SidebarControl label="Device Capabilities">
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

                <div className="grid grid-cols-2 gap-2">
                  <SidebarControl label="Time Zone">
                    <SidebarInput
                      value={state.timeZone}
                      onChange={(value) => state.setTimeZone(value)}
                      placeholder="e.g. America/New_York"
                    />
                  </SidebarControl>

                  <SidebarControl label="User Agent">
                    <SidebarInput
                      value={state.userAgent}
                      onChange={(value) => state.setUserAgent(value)}
                      placeholder="Navigator user agent"
                    />
                  </SidebarControl>
                </div>

                <SidebarControl label="Safe Area Insets">
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
                        value={String(state.safeAreaInsets.top)}
                        onChange={(value) =>
                          state.setSafeAreaInsets((prev) => ({ ...prev, top: Number(value) }))
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
                        value={String(state.safeAreaInsets.bottom)}
                        onChange={(value) =>
                          state.setSafeAreaInsets((prev) => ({ ...prev, bottom: Number(value) }))
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
                        value={String(state.safeAreaInsets.left)}
                        onChange={(value) =>
                          state.setSafeAreaInsets((prev) => ({ ...prev, left: Number(value) }))
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
                        value={String(state.safeAreaInsets.right)}
                        onChange={(value) =>
                          state.setSafeAreaInsets((prev) => ({ ...prev, right: Number(value) }))
                        }
                      />
                    </div>
                  </div>
                </SidebarControl>
              </div>
            </SidebarCollapsibleControl>

            <SidebarCollapsibleControl label="App Context" defaultCollapsed>
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

            <SidebarCollapsibleControl label="Tool Input (JSON)">
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
              <button
                type="button"
                onClick={state.sendToolInputPartial}
                disabled={!!state.toolInputError}
                className="mt-1 w-full rounded px-2 py-1 text-xs disabled:opacity-40"
                style={{
                  backgroundColor: 'var(--color-background-tertiary)',
                  color: 'var(--color-text-secondary)',
                  border: '1px solid var(--color-border-primary)',
                }}
              >
                Send as Partial (Streaming)
              </button>
            </SidebarCollapsibleControl>

            <SidebarCollapsibleControl label="Tool Result (JSON)" defaultCollapsed={false}>
              <SidebarTextarea
                value={state.toolResultJson}
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
            userMessage={state.selectedSim?.userMessage}
            isTransitioning={state.isTransitioning}
            key={`${state.activeHost}-${state.selectedSimulationName}`}
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
