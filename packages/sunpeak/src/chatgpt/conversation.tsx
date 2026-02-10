import * as React from 'react';
import { CloseBold } from '@openai/apps-sdk-ui/components/Icon';
import { SCREEN_WIDTHS, type ScreenWidth } from './chatgpt-simulator-types';
import type { McpUiDisplayMode, McpUiHostContext } from '@modelcontextprotocol/ext-apps';

type Platform = NonNullable<McpUiHostContext['platform']>;

interface ConversationProps {
  children?: React.ReactNode;
  screenWidth: ScreenWidth;
  displayMode: McpUiDisplayMode;
  platform: Platform;
  onRequestDisplayMode?: (mode: McpUiDisplayMode) => void;
  appName?: string;
  appIcon?: string;
  userMessage?: string;
}

/**
 * Conversation layout that renders children (iframe) at a stable tree position.
 *
 * All three display modes (inline, pip, fullscreen) share the same React tree
 * shape so that the iframe never unmounts when switching modes, avoiding a
 * white-flash reload.
 *
 * Visual differences are achieved purely with CSS:
 * - **inline**: content in normal document flow
 * - **pip**: content wrapper becomes `position: fixed` floating overlay
 * - **fullscreen**: content wrapper becomes `position: fixed` covering the viewport;
 *   fullscreen chrome (header/footer) rendered as a separate fixed overlay
 */
export function Conversation({
  children,
  screenWidth,
  displayMode,
  platform,
  onRequestDisplayMode,
  appName = 'Sunpeak',
  appIcon,
  userMessage = 'What have you got for me today?',
}: ConversationProps) {
  const isDesktop = platform === 'desktop';
  const containerWidth = screenWidth === 'full' ? '100%' : `${SCREEN_WIDTHS[screenWidth]}px`;
  const isFullscreen = displayMode === 'fullscreen';
  const isPip = displayMode === 'pip';

  const handleClose = () => onRequestDisplayMode?.('inline');

  return (
    <div
      className="flex flex-col bg-surface w-full h-full flex-1 items-center relative"
      style={{ transform: 'translate(0)' }}
    >
      {/* ─── Fullscreen chrome overlay ─── */}
      {/* Rendered as a fixed overlay above the content (z-[51] > z-50). */}
      {/* pointer-events-none on container, pointer-events-auto on interactive parts. */}
      {isFullscreen && (
        <div
          className="fixed start-0 end-0 top-0 bottom-0 z-[51] mx-auto flex flex-col pointer-events-none"
          style={{ maxWidth: containerWidth }}
        >
          <div className="border-subtle bg-token-bg-primary sm:bg-token-bg-primary z-10 grid h-[3.25rem] grid-cols-[1fr_auto_1fr] border-b px-2 pointer-events-auto">
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
            {isDesktop && <div />}
          </div>
          {/* Spacer - pointer events pass through to content below */}
          <div className="flex-1" />
          <footer className="bg-surface pointer-events-auto">
            <div className="max-w-[48rem] mx-auto px-4 py-4">
              <div className="relative">
                <input
                  type="text"
                  name="userInput"
                  disabled
                  placeholder="Message sunpeak.ai"
                  className="w-full dark:bg-[#303030] text-secondary-foreground placeholder:text-muted-foreground rounded-3xl px-5 py-3 pr-12 shadow-md light:border border-[#0000000f]"
                />
              </div>
            </div>
          </footer>
        </div>
      )}

      {/* ─── Conversation header ─── */}
      {/* Hidden in fullscreen since the fullscreen chrome has its own header */}
      {!isFullscreen && (
        <header
          className="h-12 bg-surface flex items-center px-4 text-lg sticky top-0 z-40 w-full"
          style={{ maxWidth: containerWidth }}
        >
          <span className="text-primary">sunpeak.ai</span>
        </header>
      )}

      {/* ─── Conversation container ─── */}
      <div
        className="flex flex-col flex-1 w-full transition-all duration-200 overflow-hidden"
        style={{ maxWidth: containerWidth }}
      >
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          {/* User turn - hidden in fullscreen */}
          {!isFullscreen && (
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
          )}

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
                  {/* Assistant avatar and name - hidden in fullscreen */}
                  {!isFullscreen && (
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
                  )}

                  {/* Assistant message content */}
                  <div
                    data-message-author-role="assistant"
                    className="min-h-8 relative flex w-full flex-col items-start gap-2 text-start break-words whitespace-normal"
                  >
                    <div className="flex w-full flex-col gap-1 empty:hidden">
                      {/*
                       * ─── CONTENT AREA ───
                       * Children (iframe) are always at this tree position.
                       * CSS handles visual positioning for each display mode:
                       *   inline:     normal flow (position: relative)
                       *   pip:        floating overlay (position: fixed)
                       *   fullscreen: viewport takeover (position: fixed)
                       */}
                      <div
                        className={
                          isPip
                            ? 'no-scrollbar @w-xl/main:top-4 fixed start-4 end-4 top-12 z-50 mx-auto max-w-[40rem] lg:max-w-[48rem] sm:start-0 sm:end-0 sm:top-[3.25rem] sm:w-full overflow-visible'
                            : isFullscreen
                              ? 'no-scrollbar fixed inset-x-0 top-[3.25rem] bottom-0 z-50 mx-auto'
                              : 'no-scrollbar relative mb-2 @w-sm/main:w-full mx-0 max-sm:-mx-[1rem] max-sm:w-[100cqw] max-sm:overflow-hidden overflow-visible'
                        }
                        style={{
                          ...(isPip ? { maxHeight: '480px' } : {}),
                          ...(isFullscreen ? { maxWidth: containerWidth } : {}),
                        }}
                      >
                        {/* PiP close button - keyed so it doesn't shift content's position */}
                        {isPip && (
                          <button
                            key="pip-close"
                            onClick={handleClose}
                            className="absolute -start-2 -top-1.5 z-10 rounded-full bg-[#3a3a3a] p-1.5 text-white shadow-[0px_0px_0px_1px_#fff3,0px_4px_12px_rgba(0,0,0,0.12)] hover:bg-[#6a6a6a]"
                            aria-label="Close picture-in-picture"
                            type="button"
                          >
                            <CloseBold className="h-4 w-4" />
                          </button>
                        )}
                        <div
                          key="content"
                          className={
                            isPip
                              ? 'relative overflow-hidden h-full rounded-2xl sm:rounded-3xl shadow-[0px_0px_0px_1px_#fff3,0px_6px_20px_rgba(0,0,0,0.1)] md:-mx-4'
                              : isFullscreen
                                ? 'relative overflow-hidden h-full'
                                : 'relative overflow-hidden h-full'
                          }
                        >
                          <div
                            className={
                              isPip
                                ? 'h-full w-full max-w-full overflow-auto bg-white dark:bg-[#212121]'
                                : isFullscreen
                                  ? 'h-full w-full max-w-full overflow-auto bg-surface'
                                  : 'h-full w-full max-w-full bg-transparent'
                            }
                          >
                            {children}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </article>
        </main>

        {/* Input area - hidden in fullscreen since fullscreen chrome has its own footer */}
        {!isFullscreen && (
          <footer className="bg-surface">
            <div className="max-w-[48rem] mx-auto px-4 py-4">
              <div className="relative">
                <input
                  type="text"
                  name="userInput"
                  disabled
                  placeholder="Message sunpeak.ai"
                  className="w-full dark:bg-[#303030] text-secondary-foreground placeholder:text-muted-foreground rounded-3xl px-5 py-3 pr-12 shadow-md light:border border-[#0000000f]"
                />
              </div>
            </div>
          </footer>
        )}
      </div>
    </div>
  );
}
