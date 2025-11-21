import * as React from 'react';
import { useEffect, useState, useMemo } from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarProvider,
} from '../components/shadcn/sidebar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/shadcn/select';
import { Label } from '../components/shadcn/label';
import { Conversation } from './conversation';
import { initMockOpenAI } from './mock-openai';
import { ThemeProvider } from '../components/theme-provider';
import type { Theme, DisplayMode } from '../types';
import type { ScreenWidth } from '../types/simulator';
import '../styles/chatgpt/index.css';

interface ChatGPTSimulatorProps {
  children: React.ReactNode;
  appName?: string;
  appIcon?: string;
  userMessage?: string;
}

export function ChatGPTSimulator({
  children,
  appName,
  appIcon,
  userMessage
}: ChatGPTSimulatorProps) {
  const [theme, setTheme] = useState<Theme>('dark');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('inline');
  const [screenWidth, setScreenWidth] = useState<ScreenWidth>('full');

  const mock = useMemo(() => initMockOpenAI(), []);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as unknown as { openai?: unknown }).openai;
      }
    };
  }, []);

  useEffect(() => {
    if (mock) {
      mock.setTheme(theme);
    }
  }, [mock, theme]);

  useEffect(() => {
    if (mock) {
      mock.setDisplayMode(displayMode);
    }
  }, [mock, displayMode]);

  return (
    <ThemeProvider theme={theme}>
      <SidebarProvider defaultOpen={true}>
        <Sidebar>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel className="text-[var(--sp-color-text-primary)]">
                Controls
              </SidebarGroupLabel>
              <SidebarGroupContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="app-ui-select" className="text-xs text-[var(--sp-color-text-primary)]">
                    App UI
                  </Label>
                  <Select value="carousel" onValueChange={() => {}}>
                    <SelectTrigger id="app-ui-select" className="text-[var(--sp-color-text-primary)]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="carousel">Carousel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="theme-select" className="text-xs text-[var(--sp-color-text-primary)]">
                    Color Scheme
                  </Label>
                  <Select value={theme} onValueChange={(value) => setTheme(value as Theme)}>
                    <SelectTrigger id="theme-select" className="text-[var(--sp-color-text-primary)]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="display-mode-select" className="text-xs text-[var(--sp-color-text-primary)]">
                    Display Mode
                  </Label>
                  <Select value={displayMode} onValueChange={(value) => setDisplayMode(value as DisplayMode)}>
                    <SelectTrigger id="display-mode-select" className="text-[var(--sp-color-text-primary)]">
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
                  <Label htmlFor="screen-width-select" className="text-xs text-[var(--sp-color-text-primary)]">
                    Body Width
                  </Label>
                  <Select value={screenWidth} onValueChange={(value) => setScreenWidth(value as ScreenWidth)}>
                    <SelectTrigger id="screen-width-select" className="text-[var(--sp-color-text-primary)]">
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
