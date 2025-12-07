import * as React from 'react';
import { CloseBold } from '@openai/apps-sdk-ui/components/Icon';
import { useDisplayMode, useWidgetAPI } from '../hooks';
import { SCREEN_WIDTHS, type ScreenWidth } from './chatgpt-simulator-types';

interface ConversationProps {
  children: React.ReactNode;
  screenWidth: ScreenWidth;
  appName?: string;
  appIcon?: string;
  userMessage?: string;
}

export function Conversation({
  children,
  screenWidth,
  appName = 'Sunpeak App',
  appIcon,
  userMessage = 'What have you got for me today?',
}: ConversationProps) {
  // Read displayMode from window.openai (same source the App uses)
  const displayMode = useDisplayMode() ?? 'inline';
  const api = useWidgetAPI();
  const containerWidth = screenWidth === 'full' ? '100%' : `${SCREEN_WIDTHS[screenWidth]}px`;

  // Fullscreen mode: children take over the entire conversation area
  if (displayMode === 'fullscreen') {
    const handleClose = () => {
      if (api?.requestDisplayMode) {
        api.requestDisplayMode({ mode: 'inline' });
      }
    };

    return (
      <div className="flex flex-col bg-surface w-full h-full flex-1">
        <div className="border-subtle bg-surface z-10 grid h-12 grid-cols-[1fr_auto_1fr] border-b px-2">
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
          <div className="text-primary flex items-center justify-center text-base">{appName}</div>
          <div className="flex items-center justify-end"></div>
        </div>
        <div className="relative overflow-hidden flex-1">
          <div className="h-full w-full max-w-full overflow-auto">{children}</div>
        </div>
        <footer className="bg-surface">
          <div className="max-w-[48rem] mx-auto px-4 py-4">
            <div className="relative">
              <input
                type="text"
                name="userInput"
                disabled
                placeholder="Message SimGPT"
                className="w-full bg-[var(--color-background-primary)] dark:bg-[#303030] text-secondary-foreground placeholder:text-muted-foreground rounded-3xl px-5 py-3 pr-12 shadow-md light:border border-[#0000000f]"
              />
            </div>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-surface w-full h-full flex-1">
      {/* Header bar */}
      <header className="h-12 bg-surface flex items-center px-4 text-lg sticky top-0 z-40">
        <span className="text-primary">SimGPT</span>
      </header>

      {/* Conversation container with configurable width */}
      <div
        className="flex flex-col flex-1 mx-auto w-full transition-all duration-200 overflow-hidden"
        style={{ maxWidth: containerWidth }}
      >
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          {/* User turn */}
          <article className="text-primary w-full focus:outline-none" dir="auto" data-turn="user">
            <h5 className="sr-only">You said:</h5>
            <div className="text-base my-auto mx-auto md:pt-12 px-4">
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
                      {/* App UI content area - allows horizontal overflow for carousel */}
                      {displayMode === 'pip' ? (
                        <div
                          className="fixed start-4 end-4 top-14 z-50 mx-auto max-w-[48rem] md:start-60 md:end-4 sm:start-0 sm:end-0 sm:w-full overflow-visible"
                          style={{ maxHeight: '429px' }}
                        >
                          <button
                            onClick={() => {
                              if (api?.requestDisplayMode) {
                                api.requestDisplayMode({ mode: 'inline' });
                              }
                            }}
                            className="absolute -start-2 -top-1.5 z-10 rounded-full bg-[#3a3a3a] p-1.5 text-white shadow-[0px_0px_0px_1px_var(--border-heavy),0px_4px_12px_rgba(0,0,0,0.12)] hover:bg-[#6a6a6a]"
                            aria-label="Close picture-in-picture"
                            type="button"
                          >
                            <CloseBold className="h-4 w-4" />
                          </button>
                          <div className="relative overflow-hidden h-full rounded-2xl sm:rounded-3xl shadow-[0px_0px_0px_1px_var(--border-heavy),0px_6px_20px_rgba(0,0,0,0.1)] border border-subtle">
                            <div className="h-full w-full max-w-full overflow-auto bg-surface">
                              {children}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full overflow-x-auto">{children}</div>
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
                className="w-full bg-[var(--color-background-primary)] dark:bg-[#303030] text-secondary-foreground placeholder:text-muted-foreground rounded-3xl px-5 py-3 pr-12 shadow-md light:border border-[#0000000f]"
              />
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
