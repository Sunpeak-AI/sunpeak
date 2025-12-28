import * as React from 'react';
import { CloseBold } from '@openai/apps-sdk-ui/components/Icon';
import { Button } from '@openai/apps-sdk-ui/components/Button';
import { useDisplayMode, useUserAgent, useWidgetAPI } from '../hooks';
import { SCREEN_WIDTHS, type ScreenWidth } from './chatgpt-simulator-types';

interface ConversationProps {
  children: React.ReactNode;
  screenWidth: ScreenWidth;
  appName?: string;
  appIcon?: string;
  userMessage?: string;
  resourceMeta?: Record<string, unknown>;
}

export function Conversation({
  children,
  screenWidth,
  appName = 'Sunpeak',
  appIcon,
  userMessage = 'What have you got for me today?',
  resourceMeta,
}: ConversationProps) {
  // Read displayMode from window.openai (same source the App uses)
  const displayMode = useDisplayMode() ?? 'inline';
  const api = useWidgetAPI();
  const userAgent = useUserAgent();
  const isDesktop = userAgent?.device.type === 'desktop';
  const containerWidth = screenWidth === 'full' ? '100%' : `${SCREEN_WIDTHS[screenWidth]}px`;

  // Fullscreen mode: children take over the entire conversation area
  if (displayMode === 'fullscreen') {
    const handleClose = () => {
      if (api?.requestDisplayMode) {
        api.requestDisplayMode({ mode: 'inline' });
      }
    };

    return (
      <div
        className="flex flex-col bg-surface w-full h-full flex-1 items-center relative"
        style={{ transform: 'translate(0)' }}
      >
        {/* Match reference HTML structure for fullscreen */}
        <div
          className="no-scrollbar fixed start-0 end-0 top-0 bottom-0 z-50 mx-auto flex w-auto flex-col overflow-hidden"
          style={{ maxWidth: containerWidth }}
        >
          <div className="border-subtle bg-token-bg-primary sm:bg-token-bg-primary z-10 grid h-[3.25rem] grid-cols-[1fr_auto_1fr] border-b px-2">
            <div className="flex items-center justify-start gap-3">
              <button
                onClick={handleClose}
                aria-label="Close"
                className="h-7 w-7 flex items-center justify-center hover:bg-subtle rounded-md transition-colors text-primary"
                type="button"
              >
                <CloseBold />
              </button>
            </div>
            {isDesktop && (
              <div className="text-primary flex items-center justify-center text-base">
                {appName}
              </div>
            )}
            {isDesktop && (
              <div className="flex items-center justify-end">
                <Button
                  variant="outline"
                  color="primary"
                  className="bg-token-bg-primary"
                  onClick={() => {
                    const widgetDomain = resourceMeta?.['openai/widgetDomain'] as
                      | string
                      | undefined;
                    if (api?.openExternal && widgetDomain) {
                      api.openExternal({ href: widgetDomain });
                    }
                  }}
                >
                  {appIcon && (
                    <span className="me-2 h-4 w-4 flex items-center justify-center">{appIcon}</span>
                  )}
                  Open in {appName}
                </Button>
              </div>
            )}
          </div>
          <div className="relative overflow-hidden flex-1 min-h-0">
            {/* Simulated iframe - scrollable when content exceeds viewport */}
            <div className="h-full w-full max-w-full overflow-auto">{children}</div>
          </div>
          {/* Input area */}
          <footer className="bg-surface">
            <div className="max-w-[48rem] mx-auto px-4 py-4">
              <div className="relative">
                <input
                  type="text"
                  name="userInput"
                  disabled
                  placeholder="Message SimGPT"
                  className="w-full dark:bg-[#303030] text-secondary-foreground placeholder:text-muted-foreground rounded-3xl px-5 py-3 pr-12 shadow-md light:border border-[#0000000f]"
                />
              </div>
            </div>
          </footer>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col bg-surface w-full h-full flex-1 items-center relative"
      style={{ transform: 'translate(0)' }}
    >
      {/* Header bar */}
      <header
        className="h-12 bg-surface flex items-center px-4 text-lg sticky top-0 z-40 w-full"
        style={{ maxWidth: containerWidth }}
      >
        <span className="text-primary">SimGPT</span>
      </header>

      {/* Conversation container with configurable width */}
      <div
        className="flex flex-col flex-1 w-full transition-all duration-200 overflow-hidden"
        style={{ maxWidth: containerWidth }}
      >
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          {/* User turn */}
          <article className="text-primary w-full focus:outline-none" dir="auto" data-turn="user">
            <h5 className="sr-only">You said:</h5>
            <div className="text-base my-auto mx-auto md:pt-8 px-4">
              <div className="max-w-[48rem] mx-auto flex-1 relative flex w-full min-w-0 flex-col">
                <div className="flex max-w-full flex-col grow">
                  <div
                    data-message-author-role="user"
                    className="min-h-8 relative flex w-full flex-col items-end gap-2 text-start break-words whitespace-normal"
                  >
                    <div className="flex w-full flex-col gap-1 empty:hidden items-end">
                      <div className="bg-[var(--color-background-primary-soft)] relative rounded-[18px] px-4 py-3 max-w-[70%]">
                        <div className="whitespace-pre-wrap">{userMessage}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </article>

          {/* Assistant turn */}
          <article
            className="text-primary w-full focus:outline-none"
            dir="auto"
            data-turn="assistant"
          >
            <h6 className="sr-only">{appName} said:</h6>
            <div className="text-base my-auto mx-auto pb-10 px-4">
              <div className="max-w-[48rem] mx-auto flex-1 relative flex w-full min-w-0 flex-col">
                <div className="flex max-w-full flex-col grow">
                  {/* Assistant avatar and name */}
                  <div className="flex items-center gap-2 my-3">
                    {appIcon ? (
                      <div className="size-6 flex items-center justify-center text-base">
                        {appIcon}
                      </div>
                    ) : (
                      <div className="size-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-medium text-xs">
                        AI
                      </div>
                    )}
                    <span className="font-semibold text-sm">{appName}</span>
                  </div>

                  {/* Assistant message content */}
                  <div
                    data-message-author-role="assistant"
                    className="min-h-8 relative flex w-full flex-col items-start gap-2 text-start break-words whitespace-normal"
                  >
                    <div className="flex w-full flex-col gap-1 empty:hidden">
                      {/* App UI content area - allows horizontal overflow */}
                      {displayMode === 'pip' ? (
                        <div
                          className="no-scrollbar @w-xl/main:top-4 fixed start-4 end-4 top-12 z-50 mx-auto max-w-[40rem] lg:max-w-[48rem] sm:start-0 sm:end-0 sm:top-[3.25rem] sm:w-full overflow-visible"
                          style={{ maxHeight: '480px' }}
                        >
                          <button
                            onClick={() => {
                              if (api?.requestDisplayMode) {
                                api.requestDisplayMode({ mode: 'inline' });
                              }
                            }}
                            className="absolute -start-2 -top-1.5 z-10 rounded-full bg-[#3a3a3a] p-1.5 text-white shadow-[0px_0px_0px_1px_#fff3,0px_4px_12px_rgba(0,0,0,0.12)] hover:bg-[#6a6a6a]"
                            aria-label="Close picture-in-picture"
                            type="button"
                          >
                            <CloseBold className="h-4 w-4" />
                          </button>
                          <div className="relative overflow-hidden h-full rounded-2xl sm:rounded-3xl shadow-[0px_0px_0px_1px_#fff3,0px_6px_20px_rgba(0,0,0,0.1)] md:-mx-4">
                            {/* Simulated iframe - scrollable content */}
                            <div className="h-full w-full max-w-full overflow-auto bg-white dark:bg-[#212121]">
                              {children}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="no-scrollbar relative mb-2 @w-sm/main:w-full mx-0 max-sm:-mx-[1rem] max-sm:w-[100cqw] max-sm:overflow-hidden overflow-visible">
                          <div className="relative overflow-hidden h-full">
                            {/* Simulated iframe - expands to content height, not scrollable */}
                            {children}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </article>
        </main>

        {/* Input area */}
        <footer className="bg-surface">
          <div className="max-w-[48rem] mx-auto px-4 py-4">
            <div className="relative">
              <input
                type="text"
                name="userInput"
                disabled
                placeholder="Message SimGPT"
                className="w-full dark:bg-[#303030] text-secondary-foreground placeholder:text-muted-foreground rounded-3xl px-5 py-3 pr-12 shadow-md light:border border-[#0000000f]"
              />
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
