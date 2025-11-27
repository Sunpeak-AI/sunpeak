import './globals.css';

import * as React from 'react';
import { useEffect, useLayoutEffect, useMemo } from 'react';
import { SimpleSidebar, SidebarControl, SidebarSelect } from './simple-sidebar';
import { Conversation } from './conversation';
import { initMockOpenAI } from './mock-openai';
import { ThemeProvider } from './theme-provider';
import { useTheme, useDisplayMode } from '../hooks';
import type { Theme, DisplayMode } from '../types';
import type { ScreenWidth } from './chatgpt-simulator-types';

const DEFAULT_THEME: Theme = 'dark';
const DEFAULT_DISPLAY_MODE: DisplayMode = 'inline';

/**
 * A simulation packages a component with its example data and metadata.
 * Each simulation represents a complete tool experience in the simulator.
 */
export interface Simulation {
  value: string;
  label: string;
  component: React.ComponentType;
  userMessage?: string;

  // Optional simulation globals (from ToolConfig sim* fields)
  simTheme?: Theme;
  simUserAgent?: import('../types').UserAgent;
  simLocale?: string;
  simMaxHeight?: number;
  simDisplayMode?: DisplayMode;
  simSafeArea?: import('../types').SafeArea;
  simView?: import('../types').View | null;
  simToolInput?: Record<string, unknown>;
  simWidgetState?: Record<string, unknown> | null;
  mcpToolOutput?: Record<string, unknown> | null;
}

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
  const [selectedKey, setSelectedKey] = React.useState<string>(
    simulations.length > 0 ? simulations[0].value : ''
  );

  // Get the selected simulation
  const selectedSim = simulations.find((sim) => sim.value === selectedKey);

  // Extract metadata from the selected simulation
  const userMessage = selectedSim?.userMessage;

  const mock = useMemo(
    () =>
      initMockOpenAI({
        theme: selectedSim?.simTheme ?? DEFAULT_THEME,
        userAgent: selectedSim?.simUserAgent,
        locale: selectedSim?.simLocale,
        maxHeight: selectedSim?.simMaxHeight,
        displayMode: selectedSim?.simDisplayMode ?? DEFAULT_DISPLAY_MODE,
        safeArea: selectedSim?.simSafeArea,
        view: selectedSim?.simView,
        toolInput: selectedSim?.simToolInput,
        widgetState: selectedSim?.simWidgetState ?? null,
        toolOutput: selectedSim?.mcpToolOutput ?? null,
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
  const SelectedComponent = selectedSim?.component;
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
                  options={simulations.map((sim) => ({
                    value: sim.value,
                    label: sim.label,
                  }))}
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
        >
          {content}
        </Conversation>
      </SimpleSidebar>
    </ThemeProvider>
  );
}
