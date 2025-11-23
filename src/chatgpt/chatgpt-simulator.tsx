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

interface ChatGPTSimulatorProps {
  children: React.ReactNode;
  appName?: string;
  appIcon?: string;
  userMessage?: string;
  toolOutput?: Record<string, unknown> | null;
  widgetState?: Record<string, unknown> | null;
}

export function ChatGPTSimulator({
  children,
  appName,
  appIcon,
  userMessage,
  toolOutput = null,
  widgetState = null,
}: ChatGPTSimulatorProps) {
  const [screenWidth, setScreenWidth] = React.useState<ScreenWidth>('full');

  const mock = useMemo(
    () =>
      initMockOpenAI({
        theme: DEFAULT_THEME,
        displayMode: DEFAULT_DISPLAY_MODE,
      }),
    []
  );

  // Read theme and displayMode from window.openai (same as widget code would)
  const theme = useTheme() ?? DEFAULT_THEME;
  const displayMode = useDisplayMode() ?? DEFAULT_DISPLAY_MODE;

  // Re-register mock on window.openai after each mount (handles Strict Mode remounts)
  // Also set initial toolOutput and widgetState values synchronously
  useLayoutEffect(() => {
    if (mock && typeof window !== 'undefined') {
      (window as unknown as { openai: typeof mock }).openai = mock;
      // Set initial values synchronously before first paint
      if (toolOutput !== undefined) {
        mock.setToolOutput(toolOutput);
      }
      if (widgetState !== undefined) {
        mock.setWidgetStateExternal(widgetState);
      }
    }
  }, [mock, toolOutput, widgetState]);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as unknown as { openai?: unknown }).openai;
      }
    };
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <SimpleSidebar
        controls={
          <div className="space-y-4">
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
          {children}
        </Conversation>
      </SimpleSidebar>
    </ThemeProvider>
  );
}
