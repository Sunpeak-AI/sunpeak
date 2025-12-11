import * as React from 'react';
import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
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
import { initMockOpenAI } from './mock-openai';
import { ThemeProvider } from './theme-provider';
import {
  useTheme,
  useDisplayMode,
  useLocale,
  useMaxHeight,
  useUserAgent,
  useSafeArea,
  useView,
  useToolInput,
  useWidgetState,
  useToolResponseMetadata,
  useWidgetProps,
} from '../hooks';
import { resetProviderCache } from '../providers';
import type { Theme, DisplayMode, DeviceType, ViewMode } from '../types';
import type { ScreenWidth } from './chatgpt-simulator-types';
import type { Simulation } from '../types/simulation';

const DEFAULT_THEME: Theme = 'dark';
const DEFAULT_DISPLAY_MODE: DisplayMode = 'inline';

interface ChatGPTSimulatorProps {
  children?: React.ReactNode;
  simulations?: Simulation[];
  appName?: string;
  appIcon?: string;
}

export function ChatGPTSimulator({
  children,
  simulations = [],
  appName = 'Sunpeak App',
  appIcon,
}: ChatGPTSimulatorProps) {
  const [screenWidth, setScreenWidth] = React.useState<ScreenWidth>('full');

  // Helper to check if current width is mobile
  const isMobileWidth = (width: ScreenWidth) => width === 'mobile-s' || width === 'mobile-l';

  // Helper to create simulation key from resource-tool pair
  const getSimulationKey = (sim: Simulation) => `${sim.resource.name}-${sim.tool.name}`;

  const [selectedKey, setSelectedKey] = React.useState<string>(
    simulations.length > 0 ? getSimulationKey(simulations[0]) : ''
  );

  // Get the selected simulation
  const selectedSim = simulations.find((sim) => getSimulationKey(sim) === selectedKey);

  // Extract metadata from the selected simulation
  const userMessage = selectedSim?.userMessage;

  // Create mock once and keep it stable - never recreate it
  const mock = useMemo(
    () =>
      initMockOpenAI({
        theme: DEFAULT_THEME,
        displayMode: DEFAULT_DISPLAY_MODE,
      }),
    []
  );

  // Update mock properties when simulation changes
  useEffect(() => {
    if (selectedSim) {
      // Update all properties from the selected simulation
      if (selectedSim.simulationGlobals?.theme !== undefined) {
        mock.theme = selectedSim.simulationGlobals.theme;
      } else {
        mock.theme = DEFAULT_THEME;
      }

      if (selectedSim.simulationGlobals?.displayMode !== undefined) {
        mock.displayMode = selectedSim.simulationGlobals.displayMode;
      } else {
        mock.displayMode = DEFAULT_DISPLAY_MODE;
      }

      mock.userAgent = selectedSim.simulationGlobals?.userAgent ?? mock.userAgent;
      mock.locale = selectedSim.simulationGlobals?.locale ?? 'en-US';
      // maxHeight is only defined for PiP mode (480px), undefined for inline and fullscreen
      const currentDisplayMode = selectedSim.simulationGlobals?.displayMode ?? DEFAULT_DISPLAY_MODE;
      mock.maxHeight =
        currentDisplayMode === 'pip'
          ? (selectedSim.simulationGlobals?.maxHeight ?? 480)
          : undefined;
      mock.safeArea = selectedSim.simulationGlobals?.safeArea ?? mock.safeArea;
      mock.view = selectedSim.simulationGlobals?.view ?? null;
      mock.toolInput = selectedSim.simulationGlobals?.toolInput ?? {};
      mock.widgetState = selectedSim.simulationGlobals?.widgetState ?? null;
      mock.toolOutput = selectedSim.toolCall?.structuredContent ?? null;
    }
  }, [selectedKey, selectedSim, mock]);

  // Read all globals from window.openai (same as widget code would)
  const theme = useTheme() ?? DEFAULT_THEME;
  const displayMode = useDisplayMode() ?? DEFAULT_DISPLAY_MODE;
  const locale = useLocale() ?? 'en-US';
  const maxHeight = useMaxHeight() ?? 600;
  const userAgent = useUserAgent();
  const safeArea = useSafeArea();
  const view = useView();
  const toolInput = useToolInput();
  const [widgetState] = useWidgetState();
  const toolResponseMetadata = useToolResponseMetadata();
  const toolOutput = useWidgetProps();

  // Local state for JSON editing
  const [toolInputJson, setToolInputJson] = useState(() =>
    JSON.stringify(toolInput ?? {}, null, 2)
  );
  const [toolOutputJson, setToolOutputJson] = useState(() =>
    JSON.stringify(toolOutput ?? null, null, 2)
  );
  const [toolResponseMetadataJson, setToolResponseMetadataJson] = useState(() =>
    JSON.stringify(toolResponseMetadata ?? null, null, 2)
  );
  const [widgetStateJson, setWidgetStateJson] = useState(() =>
    JSON.stringify(widgetState ?? null, null, 2)
  );
  const [viewParamsJson, setViewParamsJson] = useState(() =>
    JSON.stringify(view?.params ?? {}, null, 2)
  );

  // Track which fields are being edited to prevent reset loops
  const [editingField, setEditingField] = useState<string | null>(null);

  // JSON validation errors
  const [toolInputError, setToolInputError] = useState('');
  const [toolOutputError, setToolOutputError] = useState('');
  const [toolResponseMetadataError, setToolResponseMetadataError] = useState('');
  const [widgetStateError, setWidgetStateError] = useState('');
  const [viewParamsError, setViewParamsError] = useState('');

  // Re-register mock on window.openai after each mount (handles Strict Mode remounts)
  useLayoutEffect(() => {
    if (mock && typeof window !== 'undefined') {
      (window as unknown as { openai: typeof mock }).openai = mock;
      // Reset provider cache to ensure it detects the newly registered mock
      resetProviderCache();
    }
  }, [mock]);

  // Emit update events when mock changes to update sidebar controls
  useEffect(() => {
    if (mock) {
      mock.emitUpdate({
        theme: mock.theme,
        displayMode: mock.displayMode,
        userAgent: mock.userAgent,
        locale: mock.locale,
        maxHeight: mock.maxHeight,
        safeArea: mock.safeArea,
        view: mock.view,
        toolInput: mock.toolInput,
        toolOutput: mock.toolOutput,
        toolResponseMetadata: mock.toolResponseMetadata,
        widgetState: mock.widgetState,
      });
    }
  }, [mock]);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as unknown as { openai?: unknown }).openai;
      }
    };
  }, []);

  // Disallow PiP on mobile widths - switch to fullscreen
  useEffect(() => {
    if (isMobileWidth(screenWidth) && displayMode === 'pip') {
      mock.setDisplayMode('fullscreen');
    }
  }, [screenWidth, displayMode, mock]);

  // Reset JSON strings when simulation changes or props change
  // Only update fields that aren't currently being edited to prevent overwriting user input
  // This syncs external state (from mock) into local editing state, which is a valid use of effects
  useEffect(() => {
    if (editingField !== 'toolInput') {
      setToolInputJson(JSON.stringify(toolInput ?? {}, null, 2));
      setToolInputError('');
    }
    if (editingField !== 'toolOutput') {
      setToolOutputJson(JSON.stringify(toolOutput ?? null, null, 2));
      setToolOutputError('');
    }
    if (editingField !== 'toolResponseMetadata') {
      setToolResponseMetadataJson(JSON.stringify(toolResponseMetadata ?? null, null, 2));
      setToolResponseMetadataError('');
    }
    if (editingField !== 'widgetState') {
      setWidgetStateJson(JSON.stringify(widgetState ?? null, null, 2));
      setWidgetStateError('');
    }
    if (editingField !== 'viewParams') {
      setViewParamsJson(JSON.stringify(view?.params ?? {}, null, 2));
      setViewParamsError('');
    }
  }, [
    selectedKey,
    toolInput,
    toolOutput,
    toolResponseMetadata,
    widgetState,
    view?.params,
    editingField,
  ]);

  // Helper to validate JSON while typing (doesn't update mock)
  const validateJSON = (
    json: string,
    setJson: (value: string) => void,
    setError: (error: string) => void
  ) => {
    setJson(json);
    try {
      if (json.trim() !== '') {
        JSON.parse(json);
      }
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid JSON');
    }
  };

  // Helper to commit JSON changes on blur (updates mock)
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

  // Determine what to render
  const SelectedComponent = selectedSim?.resourceComponent;
  const content = SelectedComponent ? <SelectedComponent /> : children;

  return (
    <ThemeProvider theme={theme}>
      <SimpleSidebar
        controls={
          <div className="space-y-2">
            {simulations.length > 0 && (
              <SidebarControl label="Simulation">
                <SidebarSelect
                  value={selectedKey}
                  onChange={(value) => setSelectedKey(value)}
                  options={simulations.map((sim) => {
                    const resourceTitle =
                      (sim.resource.title as string | undefined) || sim.resource.name;
                    const toolTitle = (sim.tool.title as string | undefined) || sim.tool.name;
                    return {
                      value: getSimulationKey(sim),
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

            <SidebarControl label="Theme">
              <SidebarToggle
                value={theme}
                onChange={(value) => mock.setTheme(value as Theme)}
                options={[
                  { value: 'light', label: 'Light' },
                  { value: 'dark', label: 'Dark' },
                ]}
              />
            </SidebarControl>

            <SidebarControl label="Display Mode">
              <SidebarToggle
                value={displayMode}
                onChange={(value) => {
                  const newMode = value as DisplayMode;
                  // Disallow PiP on mobile widths - switch to fullscreen instead
                  if (isMobileWidth(screenWidth) && newMode === 'pip') {
                    mock.setDisplayMode('fullscreen');
                  } else {
                    mock.setDisplayMode(newMode);
                  }
                }}
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
                  onChange={(value) => mock.setLocale(value)}
                  placeholder="e.g. en-US"
                />
              </SidebarControl>

              <SidebarControl label="Max Height (PiP)">
                <SidebarInput
                  type="number"
                  value={displayMode === 'pip' && maxHeight !== undefined ? String(maxHeight) : ''}
                  onChange={(value) => {
                    if (displayMode === 'pip') {
                      mock.setMaxHeight(value ? Number(value) : 480);
                    }
                  }}
                  placeholder={displayMode === 'pip' ? '480' : '-'}
                  disabled={displayMode !== 'pip'}
                />
              </SidebarControl>
            </div>

            <SidebarControl label="User Agent - Device">
              <SidebarSelect
                value={userAgent?.device.type ?? 'desktop'}
                onChange={(value) => {
                  const deviceType = value as DeviceType;
                  // Set appropriate default capabilities based on device type
                  let capabilities;
                  switch (deviceType) {
                    case 'mobile':
                      capabilities = { hover: false, touch: true };
                      break;
                    case 'tablet':
                      capabilities = { hover: false, touch: true };
                      break;
                    case 'desktop':
                      capabilities = { hover: true, touch: false };
                      break;
                    case 'unknown':
                    default:
                      capabilities = { hover: true, touch: false };
                      break;
                  }
                  mock.setUserAgent({
                    ...userAgent,
                    device: { type: deviceType },
                    capabilities,
                  });
                }}
                options={[
                  { value: 'mobile', label: 'Mobile' },
                  { value: 'tablet', label: 'Tablet' },
                  { value: 'desktop', label: 'Desktop' },
                  { value: 'unknown', label: 'Unknown' },
                ]}
              />
            </SidebarControl>

            <div className="pl-4">
              <SidebarControl label="Capabilities">
                <div className="flex gap-2">
                  <SidebarCheckbox
                    checked={userAgent?.capabilities.hover ?? true}
                    onChange={(checked) =>
                      mock.setUserAgent({
                        ...userAgent,
                        device: userAgent?.device ?? { type: 'desktop' },
                        capabilities: {
                          hover: checked,
                          touch: userAgent?.capabilities.touch ?? false,
                        },
                      })
                    }
                    label="Hover"
                  />
                  <SidebarCheckbox
                    checked={userAgent?.capabilities.touch ?? false}
                    onChange={(checked) =>
                      mock.setUserAgent({
                        ...userAgent,
                        device: userAgent?.device ?? { type: 'desktop' },
                        capabilities: {
                          hover: userAgent?.capabilities.hover ?? true,
                          touch: checked,
                        },
                      })
                    }
                    label="Touch"
                  />
                </div>
              </SidebarControl>
            </div>

            <SidebarControl label="Safe Area Insets">
              <div className="grid grid-cols-2 gap-1">
                <div className="space-y-0.5">
                  <label className="text-[9px] text-secondary">Top</label>
                  <SidebarInput
                    type="number"
                    value={String(safeArea?.insets.top ?? 0)}
                    onChange={(value) =>
                      mock.setSafeArea({
                        insets: {
                          ...safeArea?.insets,
                          top: Number(value),
                          bottom: safeArea?.insets.bottom ?? 0,
                          left: safeArea?.insets.left ?? 0,
                          right: safeArea?.insets.right ?? 0,
                        },
                      })
                    }
                  />
                </div>
                <div className="space-y-0.5">
                  <label className="text-[9px] text-secondary">Bottom</label>
                  <SidebarInput
                    type="number"
                    value={String(safeArea?.insets.bottom ?? 0)}
                    onChange={(value) =>
                      mock.setSafeArea({
                        insets: {
                          ...safeArea?.insets,
                          top: safeArea?.insets.top ?? 0,
                          bottom: Number(value),
                          left: safeArea?.insets.left ?? 0,
                          right: safeArea?.insets.right ?? 0,
                        },
                      })
                    }
                  />
                </div>
                <div className="space-y-0.5">
                  <label className="text-[9px] text-secondary">Left</label>
                  <SidebarInput
                    type="number"
                    value={String(safeArea?.insets.left ?? 0)}
                    onChange={(value) =>
                      mock.setSafeArea({
                        insets: {
                          ...safeArea?.insets,
                          top: safeArea?.insets.top ?? 0,
                          bottom: safeArea?.insets.bottom ?? 0,
                          left: Number(value),
                          right: safeArea?.insets.right ?? 0,
                        },
                      })
                    }
                  />
                </div>
                <div className="space-y-0.5">
                  <label className="text-[9px] text-secondary">Right</label>
                  <SidebarInput
                    type="number"
                    value={String(safeArea?.insets.right ?? 0)}
                    onChange={(value) =>
                      mock.setSafeArea({
                        insets: {
                          ...safeArea?.insets,
                          top: safeArea?.insets.top ?? 0,
                          bottom: safeArea?.insets.bottom ?? 0,
                          left: safeArea?.insets.left ?? 0,
                          right: Number(value),
                        },
                      })
                    }
                  />
                </div>
              </div>
            </SidebarControl>

            <SidebarControl label="View Mode">
              <SidebarSelect
                value={view?.mode ?? 'default'}
                onChange={(value) =>
                  mock.setView(
                    value === 'default'
                      ? null
                      : {
                          mode: value as ViewMode,
                          params: view?.params,
                        }
                  )
                }
                options={[
                  { value: 'default', label: 'Default (null)' },
                  { value: 'modal', label: 'Modal' },
                ]}
              />
            </SidebarControl>

            {view && view.mode !== 'default' && (
              <SidebarControl label="View Params (JSON)">
                <SidebarTextarea
                  value={viewParamsJson}
                  onChange={(json) => validateJSON(json, setViewParamsJson, setViewParamsError)}
                  onFocus={() => setEditingField('viewParams')}
                  onBlur={() =>
                    commitJSON(viewParamsJson, setViewParamsError, (parsed) => {
                      if (view) {
                        mock.setView({ ...view, params: parsed ?? undefined });
                      }
                    })
                  }
                  error={viewParamsError}
                  rows={2}
                />
              </SidebarControl>
            )}

            <SidebarCollapsibleControl label="Tool Input (JSON)">
              <SidebarTextarea
                value={toolInputJson}
                onChange={(json) => validateJSON(json, setToolInputJson, setToolInputError)}
                onFocus={() => setEditingField('toolInput')}
                onBlur={() =>
                  commitJSON(toolInputJson, setToolInputError, (parsed) =>
                    mock.setToolInput(parsed ?? {})
                  )
                }
                error={toolInputError}
                rows={8}
              />
            </SidebarCollapsibleControl>

            <SidebarCollapsibleControl label="Tool Output (JSON)">
              <SidebarTextarea
                value={toolOutputJson}
                onChange={(json) => validateJSON(json, setToolOutputJson, setToolOutputError)}
                onFocus={() => setEditingField('toolOutput')}
                onBlur={() =>
                  commitJSON(toolOutputJson, setToolOutputError, (parsed) =>
                    mock.setToolOutput(parsed)
                  )
                }
                error={toolOutputError}
                rows={8}
              />
            </SidebarCollapsibleControl>

            <SidebarCollapsibleControl label="Tool Response Metadata (JSON)">
              <SidebarTextarea
                value={toolResponseMetadataJson}
                onChange={(json) =>
                  validateJSON(json, setToolResponseMetadataJson, setToolResponseMetadataError)
                }
                onFocus={() => setEditingField('toolResponseMetadata')}
                onBlur={() =>
                  commitJSON(toolResponseMetadataJson, setToolResponseMetadataError, (parsed) =>
                    mock.setToolResponseMetadata(parsed)
                  )
                }
                error={toolResponseMetadataError}
                rows={8}
              />
            </SidebarCollapsibleControl>

            <SidebarCollapsibleControl label="Widget State (JSON)">
              <SidebarTextarea
                value={widgetStateJson}
                onChange={(json) => validateJSON(json, setWidgetStateJson, setWidgetStateError)}
                onFocus={() => setEditingField('widgetState')}
                onBlur={() =>
                  commitJSON(widgetStateJson, setWidgetStateError, (parsed) =>
                    mock.setWidgetStateExternal(parsed)
                  )
                }
                error={widgetStateError}
                rows={8}
              />
            </SidebarCollapsibleControl>
          </div>
        }
      >
        <Conversation
          screenWidth={screenWidth}
          appName={appName}
          appIcon={appIcon}
          userMessage={userMessage}
          key={selectedKey}
        >
          {content}
        </Conversation>
      </SimpleSidebar>
    </ThemeProvider>
  );
}
