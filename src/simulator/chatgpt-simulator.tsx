import * as React from 'react';
import { useEffect, useState, useMemo } from 'react';
import { Sidebar } from './sidebar';
import { Conversation } from './conversation';
import { initMockOpenAI } from './mock-openai';
import type { Theme, DisplayMode } from '../types';
import type { ScreenWidth } from '../types/simulator';

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

  const themeClass = theme === 'dark' ? 'sp-theme-dark' : 'sp-theme-light';

  return (
    <div className={`flex h-screen ${themeClass}`}>
      <Sidebar
        theme={theme}
        displayMode={displayMode}
        screenWidth={screenWidth}
        onThemeChange={setTheme}
        onDisplayModeChange={setDisplayMode}
        onScreenWidthChange={setScreenWidth}
      />
      <Conversation
        screenWidth={screenWidth}
        appName={appName}
        appIcon={appIcon}
        userMessage={userMessage}
      >
        {children}
      </Conversation>
    </div>
  );
}
