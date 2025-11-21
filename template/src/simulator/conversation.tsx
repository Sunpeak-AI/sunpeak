import * as React from 'react';
import { cn } from '@/lib/index';
import { SidebarInset } from '../components/shadcn/sidebar';
import { SCREEN_WIDTHS, type ScreenWidth } from '../types/simulator';
import type { DisplayMode } from '../types';

interface ConversationProps {
  children: React.ReactNode;
  screenWidth: ScreenWidth;
  displayMode: DisplayMode;
  appName?: string;
  appIcon?: string;
  userMessage?: string;
}

export function Conversation({
  children,
  screenWidth,
  displayMode,
  appName = 'ChatGPT',
  appIcon,
  userMessage = 'Show me some interesting places to visit.',
}: ConversationProps) {
  const containerWidth =
    screenWidth === 'full' ? '100%' : `${SCREEN_WIDTHS[screenWidth]}px`;

  // Fullscreen mode: children take over the entire conversation area
  if (displayMode === 'fullscreen') {
    return (
      <SidebarInset className="flex flex-col bg-background">
        <div className="flex-1 overflow-auto">{children}</div>
      </SidebarInset>
    );
  }

  return (
    <SidebarInset className="flex flex-col bg-background">
      {/* Header bar */}
      <header className="h-12 border-b border-border bg-background flex items-center px-4 text-lg">
        <span className="text-foreground">ChatGPT</span>
      </header>

      {/* Conversation container with configurable width */}
      <div
        className="flex flex-col flex-1 mx-auto w-full transition-all duration-200 overflow-hidden"
        style={{ maxWidth: containerWidth }}
      >
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          {/* User turn */}
          <article
            className="text-foreground w-full focus:outline-none"
            dir="auto"
            data-turn="user"
          >
            <h5 className="sr-only">You said:</h5>
            <div className="text-base my-auto mx-auto pt-12 px-4">
              <div className="max-w-[48rem] mx-auto flex-1 relative flex w-full min-w-0 flex-col">
                <div className="flex max-w-full flex-col grow">
                  <div
                    data-message-author-role="user"
                    className="min-h-8 relative flex w-full flex-col items-end gap-2 text-start break-words whitespace-normal"
                  >
                    <div className="flex w-full flex-col gap-1 empty:hidden items-end">
                      <div className="bg-secondary text-secondary-foreground relative rounded-[18px] px-4 py-3 max-w-[70%]">
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
            className="text-foreground w-full focus:outline-none"
            dir="auto"
            data-turn="assistant"
          >
            <h6 className="sr-only">{appName} said:</h6>
            <div className="text-base my-auto mx-auto pb-10 px-4">
              <div className="max-w-[48rem] mx-auto flex-1 relative flex w-full min-w-0 flex-col">
                <div className="flex max-w-full flex-col grow">
                  {/* Assistant avatar and name */}
                  <div className="flex items-center gap-2 mb-3">
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
                      <div
                        className={cn(
                          'w-full overflow-x-auto',
                          displayMode === 'pip' &&
                            'fixed bottom-20 right-6 z-50 w-80 rounded-xl shadow-xl border bg-card p-4 overflow-x-hidden'
                        )}
                      >
                        {children}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </article>
        </main>

        {/* Input area */}
        <footer className="border-t border-border bg-background">
          <div className="max-w-[48rem] mx-auto px-4 py-4">
            <div className="relative">
              <input
                type="text"
                disabled
                placeholder="Message ChatGPT"
                className="w-full bg-secondary text-secondary-foreground placeholder:text-muted-foreground rounded-3xl px-5 py-3 pr-12 outline-none"
              />
            </div>
          </div>
        </footer>
      </div>
    </SidebarInset>
  );
}
