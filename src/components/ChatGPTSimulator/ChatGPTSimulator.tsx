import { useEffect, useState, type ReactNode } from 'react';
import type { DisplayMode, Theme, ChatGPTGlobals } from '../../types';
import { SET_GLOBALS_EVENT_TYPE, SetGlobalsEvent } from '../../types/chatgpt';
import './ChatGPTSimulator.css';

export interface ChatGPTSimulatorProps {
  /**
   * The component to render in the ChatGPT message
   * Can be a function that receives the selected App UI
   */
  children: ReactNode | ((uiSimulation: string) => ReactNode);

  /**
   * Initial display mode
   */
  displayMode?: DisplayMode;

  /**
   * Initial color scheme
   */
  colorScheme?: Theme;

  /**
   * Initial tool input
   */
  toolInput?: Record<string, unknown>;

  /**
   * Initial tool output
   */
  toolOutput?: Record<string, unknown> | null;

  /**
   * Initial widget state
   */
  widgetState?: Record<string, unknown> | null;

  /**
   * User message to display above the component
   */
  userMessage?: string;

  /**
   * Show simulator controls
   */
  showControls?: boolean;

  /**
   * App UIs for the App UI selector
   */
  uiSimulations?: string[];

  /**
   * Initial App UI
   */
  initialUISimulation?: string;
}

/**
 * ChatGPT Simulator Component
 *
 * Emulates the ChatGPT environment for testing components locally.
 * Provides window.openai API and renders components in a ChatGPT-like UI.
 */
export function ChatGPTSimulator({
  children,
  displayMode: initialDisplayMode = 'inline',
  colorScheme: initialColorScheme = 'dark',
  toolInput = {},
  toolOutput = null,
  widgetState: initialWidgetState = null,
  userMessage = 'Show me some recommendations',
  showControls = true,
  uiSimulations,
  initialUISimulation,
}: ChatGPTSimulatorProps) {
  const [displayMode, setDisplayMode] = useState<DisplayMode>(initialDisplayMode);
  const [widgetState, setWidgetStateInternal] = useState<Record<string, unknown> | null>(
    initialWidgetState
  );
  const [bodyWidth, setBodyWidth] = useState<string>('100%');
  const [selectedUISimulation, setSelectedUISimulation] = useState<string>(
    initialUISimulation || uiSimulations?.[0] || ''
  );
  const [viewportHeight, setViewportHeight] = useState<number>(window.innerHeight);

  // Sync colorScheme with window.openai.colorScheme as source of truth
  const [colorScheme, setColorScheme] = useState<Theme>(initialColorScheme);

  // Listen to changes in window.openai.colorScheme
  useEffect(() => {
    const handleSetGlobals = (event: Event) => {
      const customEvent = event as SetGlobalsEvent;
      if (customEvent.detail?.globals?.colorScheme) {
        setColorScheme(customEvent.detail.globals.colorScheme);
      }
    };

    window.addEventListener(SET_GLOBALS_EVENT_TYPE, handleSetGlobals);
    return () => window.removeEventListener(SET_GLOBALS_EVENT_TYPE, handleSetGlobals);
  }, []);

  // Track viewport height for fullscreen mode
  useEffect(() => {
    const handleResize = () => {
      setViewportHeight(window.innerHeight);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Initialize window.openai
  useEffect(() => {
    // In fullscreen, subtract input bar height (~80px) from viewport
    const inputBarHeight = 80;
    const openaiGlobals: ChatGPTGlobals = {
      colorScheme,
      displayMode,
      locale: 'en-US',
      maxHeight: displayMode === 'fullscreen' ? viewportHeight - inputBarHeight : 600,
      userAgent: {
        device: { type: 'desktop' },
        capabilities: { hover: true, touch: false },
      },
      safeArea: {
        insets: { top: 0, bottom: 0, left: 0, right: 0 },
      },
      toolInput,
      toolOutput,
      toolResponseMetadata: null,
      widgetState,
      setWidgetState: async (state: Record<string, unknown>) => {
        console.log('[ChatGPT Simulator] setWidgetState called:', state);
        setWidgetStateInternal(state);
      },
    };

    const openaiAPI = {
      callTool: async (name: string, args: Record<string, unknown>) => {
        console.log('[ChatGPT Simulator] callTool called:', name, args);
        return { result: 'Mock tool result' };
      },
      sendFollowUpMessage: async (args: { prompt: string }) => {
        console.log('[ChatGPT Simulator] sendFollowUpMessage called:', args);
      },
      openExternal: (payload: { href: string }) => {
        console.log('[ChatGPT Simulator] openExternal called:', payload);
        window.open(payload.href, '_blank');
      },
      requestDisplayMode: async (args: { mode: DisplayMode }) => {
        console.log('[ChatGPT Simulator] requestDisplayMode called:', args);
        setDisplayMode(args.mode);
        return { mode: args.mode };
      },
    };

    window.openai = { ...openaiGlobals, ...openaiAPI };

    // Dispatch initial event
    window.dispatchEvent(
      new CustomEvent(SET_GLOBALS_EVENT_TYPE, {
        detail: { globals: openaiGlobals },
      }) as SetGlobalsEvent
    );

    return () => {
      delete window.openai;
    };
  }, [colorScheme, displayMode, toolInput, toolOutput, widgetState, viewportHeight]);

  // Update window.openai when state changes
  useEffect(() => {
    if (window.openai) {
      const inputBarHeight = 80;
      const calculatedMaxHeight = displayMode === 'fullscreen' ? viewportHeight - inputBarHeight : 600;

      window.openai.colorScheme = colorScheme;
      window.openai.displayMode = displayMode;
      window.openai.widgetState = widgetState;
      window.openai.maxHeight = calculatedMaxHeight;

      window.dispatchEvent(
        new CustomEvent(SET_GLOBALS_EVENT_TYPE, {
          detail: {
            globals: { colorScheme, displayMode, widgetState, maxHeight: calculatedMaxHeight },
          },
        }) as SetGlobalsEvent
      );
    }
  }, [colorScheme, displayMode, widgetState, viewportHeight]);

  const isFullscreen = displayMode === 'fullscreen';

  // Render children based on whether it's a function or ReactNode
  const renderChildren = () => {
    if (typeof children === 'function') {
      return children(selectedUISimulation);
    }
    return children;
  };

  return (
    <div className={`chatgpt-simulator chatgpt-simulator--${colorScheme}`} data-display-mode={displayMode}>
      {showControls && (
        <div className="chatgpt-simulator__sidebar">
          <div className="chatgpt-simulator__sidebar-header">
            <h2>Controls</h2>
          </div>
          <div className="chatgpt-simulator__control-group">
            {uiSimulations && uiSimulations.length > 0 && (
              <label>
                App UI
                <select
                  value={selectedUISimulation}
                  onChange={(e) => setSelectedUISimulation(e.target.value)}
                >
                  {uiSimulations.map((simulation) => (
                    <option key={simulation} value={simulation}>
                      {simulation}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label>
              Color Scheme
              <select value={colorScheme} onChange={(e) => setColorScheme(e.target.value as Theme)}>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </label>
            <label>
              Display Mode
              <select
                value={displayMode}
                onChange={(e) => setDisplayMode(e.target.value as DisplayMode)}
              >
                <option value="inline">Inline</option>
                <option value="fullscreen">Fullscreen</option>
                <option value="pip">Picture-in-Picture</option>
              </select>
            </label>
            <label>
              Body Width
              <select value={bodyWidth} onChange={(e) => setBodyWidth(e.target.value)}>
                <option value="100%">100% (Full)</option>
                <option value="1024px">1024px (Laptop)</option>
                <option value="768px">768px (Tablet)</option>
                <option value="425px">425px (Mobile L)</option>
                <option value="320px">320px (Mobile S)</option>
              </select>
            </label>
          </div>
        </div>
      )}

      <div className="chatgpt-simulator__main" style={{ width: bodyWidth, maxWidth: bodyWidth }}>
        {isFullscreen && (
          <button
            className="chatgpt-simulator__close-button"
            onClick={() => setDisplayMode('inline')}
            aria-label="Exit fullscreen"
            type="button"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}

        {!isFullscreen && (
          <div className="chatgpt-simulator__header">
            <h1>ChatGPT</h1>
          </div>
        )}

        <div className="[--thread-content-max-width:40rem] thread-lg:[--thread-content-max-width:48rem] mx-auto max-w-[var(--thread-content-max-width)] flex-1 relative flex w-full min-w-0 flex-col">
          <div className="flex max-w-full flex-col grow">
            {!isFullscreen && (
              <>
                {/* User Message */}
                <div className="chatgpt-simulator__message chatgpt-simulator__message--user">
                  <div className="chatgpt-simulator__message-content">{userMessage}</div>
                </div>

                {/* Assistant Message with Component */}
                <div className="min-h-8 relative flex w-full flex-col items-end gap-2 text-start break-words whitespace-normal">
                  <div className="flex w-full flex-col gap-1 empty:hidden first:pt-[1px]">
                    <div className="w-full break-words">
                      {/* App Title */}
                      <div className="chatgpt-simulator__app-title">
                        <span className="chatgpt-simulator__app-icon">✈️</span>
                        <span className="chatgpt-simulator__app-name">Splorin</span>
                      </div>
                      <div className="chatgpt-simulator__component-slot">{renderChildren()}</div>
                    </div>
                  </div>
                </div>
              </>
            )}
            {isFullscreen && (
              <div className="chatgpt-simulator__fullscreen-content">
                {renderChildren()}
              </div>
            )}
          </div>
        </div>
      <div className="chatgpt-simulator__input-container">
        <input
          type="text"
          className="chatgpt-simulator__input"
          placeholder="Message ChatGPT"
          disabled
        />
      </div>
      </div>
    </div>
  );
}
