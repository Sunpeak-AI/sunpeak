import * as React from 'react';
import { useEffect, useLayoutEffect, useMemo } from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarProvider,
} from '../shadcn/sidebar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../shadcn/select';
import { Label } from '../shadcn/label';
import { Conversation } from './conversation';
import { initMockOpenAI } from './mock-openai';
import { ThemeProvider } from '../theme-provider';
import { useTheme, useDisplayMode } from '../../hooks';
import type { Theme, DisplayMode } from '../../types';
import type { ScreenWidth } from '../../types/simulator';

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
      <SidebarProvider defaultOpen={true}>
        <Sidebar>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel className="text-md">
                Controls
              </SidebarGroupLabel>
              <SidebarGroupContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="app-ui-select" className="text-xs">
                    App UI
                  </Label>
                  <Select value="carousel" onValueChange={() => {}}>
                    <SelectTrigger id="app-ui-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="carousel">Carousel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="theme-select" className="text-xs">
                    Color Scheme
                  </Label>
                  <Select value={theme} onValueChange={(value) => mock.setTheme(value as Theme)}>
                    <SelectTrigger id="theme-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="display-mode-select" className="text-xs">
                    Display Mode
                  </Label>
                  <Select value={displayMode} onValueChange={(value) => mock.setDisplayMode(value as DisplayMode)}>
                    <SelectTrigger id="display-mode-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inline">Inline</SelectItem>
                      <SelectItem value="pip">Picture in Picture</SelectItem>
                      <SelectItem value="fullscreen">Fullscreen</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="screen-width-select" className="text-xs">
                    Body Width
                  </Label>
                  <Select value={screenWidth} onValueChange={(value) => setScreenWidth(value as ScreenWidth)}>
                    <SelectTrigger id="screen-width-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mobile-s">Mobile S (375px)</SelectItem>
                      <SelectItem value="mobile-l">Mobile L (425px)</SelectItem>
                      <SelectItem value="tablet">Tablet (768px)</SelectItem>
                      <SelectItem value="full">100% (Full)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
        <Conversation
          screenWidth={screenWidth}
          appName={appName}
          appIcon={appIcon}
          userMessage={userMessage}
        >
          {children}
        </Conversation>
      </SidebarProvider>
    </ThemeProvider>
  );
}
