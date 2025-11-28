import * as React from 'react';
import { useEffect, useLayoutEffect, useMemo } from 'react';
import { SimpleSidebar, SidebarControl, SidebarSelect } from './simple-sidebar';
import { Conversation } from './conversation';
import { initMockOpenAI } from './mock-openai';
import { ThemeProvider } from './theme-provider';
import { useTheme, useDisplayMode } from '../hooks';
import type { Theme, DisplayMode } from '../types';
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

  // Helper to create simulation key from resource-tool pair
  const getSimulationKey = (sim: Simulation) =>
    `${sim.resource.name}-${sim.tool.name}`;

  const [selectedKey, setSelectedKey] = React.useState<string>(
    simulations.length > 0 ? getSimulationKey(simulations[0]) : ''
  );

  // Get the selected simulation
  const selectedSim = simulations.find((sim) => getSimulationKey(sim) === selectedKey);

  // Extract metadata from the selected simulation
  const userMessage = selectedSim?.userMessage;

  const mock = useMemo(
    () =>
      initMockOpenAI({
        theme: selectedSim?.simulationGlobals?.theme ?? DEFAULT_THEME,
        userAgent: selectedSim?.simulationGlobals?.userAgent,
        locale: selectedSim?.simulationGlobals?.locale,
        maxHeight: selectedSim?.simulationGlobals?.maxHeight,
        displayMode: selectedSim?.simulationGlobals?.displayMode ?? DEFAULT_DISPLAY_MODE,
        safeArea: selectedSim?.simulationGlobals?.safeArea,
        view: selectedSim?.simulationGlobals?.view,
        toolInput: selectedSim?.simulationGlobals?.toolInput,
        widgetState: selectedSim?.simulationGlobals?.widgetState ?? null,
        toolOutput: selectedSim?.toolCall?.structuredContent ?? null,
      }),
    [selectedSim]
  );

  // Read theme and displayMode from window.openai (same as widget code would)
  const theme = useTheme() ?? DEFAULT_THEME;
  const displayMode = useDisplayMode() ?? DEFAULT_DISPLAY_MODE;

  // Re-register mock on window.openai after each mount (handles Strict Mode remounts)
  useLayoutEffect(() => {
    if (mock && typeof window !== 'undefined') {
      (window as unknown as { openai: typeof mock }).openai = mock;
    }
  }, [mock]);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as unknown as { openai?: unknown }).openai;
      }
    };
  }, []);

  // Determine what to render
  const SelectedComponent = selectedSim?.resourceComponent;
  const content = SelectedComponent ? <SelectedComponent /> : children;

  return (
    <ThemeProvider theme={theme}>
      <SimpleSidebar
        controls={
          <div className="space-y-4">
            {simulations.length > 0 && (
              <SidebarControl label="Simulation">
                <SidebarSelect
                  value={selectedKey}
                  onChange={(value) => setSelectedKey(value)}
                  options={simulations.map((sim) => {
                    const resourceTitle = (sim.resource.title as string | undefined) || sim.resource.name;
                    const toolTitle = (sim.tool.title as string | undefined) || sim.tool.name;
                    return {
                      value: getSimulationKey(sim),
                      label: `${resourceTitle}: ${toolTitle}`,
                    };
                  })}
                />
              </SidebarControl>
            )}

            <SidebarControl label="Theme">
              <SidebarSelect
                value={theme}
                onChange={(value) => mock.setTheme(value as Theme)}
                options={[
                  { value: 'light', label: 'Light' },
                  { value: 'dark', label: 'Dark' },
                ]}
              />
            </SidebarControl>

            <SidebarControl label="Display Mode">
              <SidebarSelect
                value={displayMode}
                onChange={(value) => mock.setDisplayMode(value as DisplayMode)}
                options={[
                  { value: 'inline', label: 'Inline' },
                  { value: 'pip', label: 'Picture in Picture' },
                  { value: 'fullscreen', label: 'Fullscreen' },
                ]}
              />
            </SidebarControl>

            <SidebarControl label="Body Width">
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
