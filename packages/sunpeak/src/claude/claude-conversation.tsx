import * as React from 'react';
import { useEffect, useRef, useCallback } from 'react';
import { SCREEN_WIDTHS, type ScreenWidth } from '../inspector/inspector-types';
import type { McpUiDisplayMode, McpUiHostContext } from '@modelcontextprotocol/ext-apps';

type Platform = NonNullable<McpUiHostContext['platform']>;

interface ClaudeConversationProps {
  children?: React.ReactNode;
  screenWidth: ScreenWidth;
  displayMode: McpUiDisplayMode;
  platform: Platform;
  onRequestDisplayMode?: (mode: McpUiDisplayMode) => void;
  appName?: string;
  appIcon?: string;
  userMessage?: string;
  /** Optional action element rendered in the conversation header (e.g., Run button) */
  headerAction?: React.ReactNode;
  /** Called when the content container width changes */
  onContentWidthChange?: (width: number) => void;
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 4L4 12M4 4L12 12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M10 3L5 8L10 13"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Claude conversation shell — mimics Claude's chat UI chrome.
 *
 * All three display modes (inline, pip, fullscreen) share the same React tree
 * shape so that the iframe never unmounts when switching modes.
 */
export function ClaudeConversation({
  children,
  screenWidth,
  displayMode,
  platform,
  onRequestDisplayMode,
  appName = 'Sunpeak',
  appIcon,
  userMessage = 'What have you got for me today?',
  headerAction,
  onContentWidthChange,
}: ClaudeConversationProps) {
  const isDesktop = platform === 'desktop';
  const containerWidth = screenWidth === 'full' ? '100%' : `${SCREEN_WIDTHS[screenWidth]}px`;
  const isFullscreen = displayMode === 'fullscreen';
  const isPip = displayMode === 'pip';

  // Measure the content container width and report it via onContentWidthChange.
  const contentRef = useRef<HTMLDivElement>(null);
  const onContentWidthChangeRef = useRef(onContentWidthChange);
  useEffect(() => {
    onContentWidthChangeRef.current = onContentWidthChange;
  });

  const setContentRef = useCallback((node: HTMLDivElement | null) => {
    contentRef.current = node;
  }, []);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = Math.round(entry.contentBoxSize[0]?.inlineSize ?? entry.contentRect.width);
        if (width > 0) {
          onContentWidthChangeRef.current?.(width);
        }
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleClose = () => onRequestDisplayMode?.('inline');

  return (
    <div
      className="flex flex-col w-full h-full flex-1 items-center relative"
      style={{
        transform: 'translate(0)',
        backgroundColor: 'var(--sim-bg-conversation, var(--color-background-primary))',
        color: 'var(--color-text-primary)',
        fontFamily: 'var(--font-sans)',
        WebkitFontSmoothing: 'antialiased',
      }}
    >
      {/* ─── Fullscreen chrome overlay ─── */}
      {isFullscreen && (
        <div
          className="fixed start-0 end-0 top-0 bottom-0 z-[51] mx-auto flex flex-col pointer-events-none"
          style={{ maxWidth: containerWidth }}
        >
          <div
            className="z-10 flex items-center h-12 border-b px-3 pointer-events-auto"
            style={{
              borderColor: 'var(--color-border-primary)',
              backgroundColor: 'var(--sim-bg-conversation, var(--color-background-primary))',
            }}
          >
            <button
              onClick={handleClose}
              aria-label="Back"
              className="h-8 w-8 flex items-center justify-center rounded-lg transition-colors hover:opacity-70"
              type="button"
            >
              <BackIcon />
            </button>
            <div className="flex-1 text-center text-sm font-medium">{appName}</div>
            {isDesktop && <div className="w-8" />}
          </div>
          <div className="flex-1" />
          <footer
            className="pointer-events-auto p-3"
            style={{
              backgroundColor: 'var(--sim-bg-conversation, var(--color-background-primary))',
            }}
          >
            <div className="max-w-[48rem] mx-auto">
              <div
                className="relative rounded-[20px] px-4 py-2.5"
                style={{
                  backgroundColor: 'var(--sim-bg-reply-input, var(--color-background-secondary))',
                  boxShadow:
                    '0 4px 20px rgba(0, 0, 0, 0.035), 0 0 0 0.5px var(--color-border-tertiary)',
                }}
              >
                <div
                  className="w-full text-base outline-none opacity-50"
                  style={{
                    lineHeight: '1.4',
                    color: 'var(--color-text-tertiary)',
                  }}
                >
                  Reply to sunpeak...
                </div>
              </div>
            </div>
          </footer>
        </div>
      )}

      {/* ─── Conversation header ─── */}
      {!isFullscreen && (
        <header
          className="h-12 flex items-center gap-3 px-4 text-sm font-medium sticky top-0 z-40 w-full"
          style={{
            maxWidth: containerWidth,
            backgroundColor: 'var(--sim-bg-conversation, var(--color-background-primary))',
          }}
        >
          <span>sunpeak.ai</span>
          {headerAction}
        </header>
      )}

      {/* ─── Conversation container ─── */}
      <div
        className="flex flex-col flex-1 w-full transition-all duration-200 overflow-hidden"
        style={{ maxWidth: containerWidth }}
      >
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          {/* User turn */}
          {!isFullscreen && (
            <article className="w-full" dir="auto" data-turn="user">
              <div className="px-4 py-4">
                <div className="max-w-[48rem] mx-auto flex justify-end">
                  <div
                    className="inline-flex rounded-xl max-w-[85%] break-words"
                    style={{
                      padding: '10px 16px',
                      lineHeight: '22.4px',
                      fontSize: '16px',
                      fontWeight: 430,
                      backgroundColor:
                        'var(--sim-bg-user-bubble, var(--color-background-tertiary))',
                    }}
                  >
                    {userMessage}
                  </div>
                </div>
              </div>
            </article>
          )}

          {/* Assistant turn */}
          <article className="w-full" dir="auto" data-turn="assistant">
            <h6 className="sr-only">{appName} said:</h6>
            <div className="px-4 py-2">
              <div className="max-w-[48rem] mx-auto">
                {/* Claude avatar + name */}
                {!isFullscreen && (
                  <div className="flex items-center gap-2 mb-3">
                    {appIcon ? (
                      appIcon.startsWith('data:') || appIcon.startsWith('http') ? (
                        <img src={appIcon} alt="" className="size-6 rounded-full object-cover" />
                      ) : (
                        <div className="size-6 flex items-center justify-center text-base">
                          {appIcon}
                        </div>
                      )
                    ) : (
                      <div
                        className="size-6 rounded-full flex items-center justify-center text-xs font-medium text-white"
                        style={{ backgroundColor: '#c55a30' }}
                      >
                        C
                      </div>
                    )}
                    <span className="text-sm font-medium">{appName}</span>
                  </div>
                )}

                {/* ─── CONTENT AREA ─── */}
                <div
                  ref={setContentRef}
                  className={
                    isPip
                      ? 'fixed start-4 end-4 top-12 z-50 mx-auto max-w-[40rem] lg:max-w-[48rem] sm:start-0 sm:end-0 sm:top-[3rem] sm:w-full overflow-visible'
                      : isFullscreen
                        ? 'fixed inset-x-0 top-[3rem] bottom-0 z-50 mx-auto'
                        : 'relative mb-2 w-full overflow-visible'
                  }
                  style={{
                    ...(isPip ? { maxHeight: '480px' } : {}),
                    ...(isFullscreen ? { maxWidth: containerWidth } : {}),
                  }}
                >
                  {/* PiP close button */}
                  {isPip && (
                    <button
                      key="pip-close"
                      onClick={handleClose}
                      className="absolute -start-2 -top-1.5 z-10 rounded-full p-1.5 text-white shadow-md"
                      style={{ backgroundColor: '#4a4a4a' }}
                      aria-label="Close picture-in-picture"
                      type="button"
                    >
                      <CloseIcon />
                    </button>
                  )}
                  <div
                    key="content"
                    className={
                      isPip
                        ? 'relative overflow-hidden h-full rounded-2xl shadow-lg'
                        : 'relative overflow-hidden h-full'
                    }
                  >
                    <div
                      className="h-full w-full max-w-full"
                      style={{
                        ...(isPip
                          ? {
                              overflow: 'auto',
                              backgroundColor: 'var(--color-background-secondary)',
                            }
                          : isFullscreen
                            ? {
                                overflow: 'auto',
                                backgroundColor: 'var(--color-background-primary)',
                              }
                            : { backgroundColor: 'transparent' }),
                      }}
                    >
                      {children}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </article>
        </main>

        {/* Input area */}
        {!isFullscreen && (
          <footer
            style={{
              backgroundColor: 'var(--sim-bg-conversation, var(--color-background-primary))',
            }}
          >
            <div className="max-w-[48rem] mx-auto px-4 py-4">
              <div
                className="relative rounded-[20px] px-4 py-2.5"
                style={{
                  backgroundColor: 'var(--sim-bg-reply-input, var(--color-background-secondary))',
                  boxShadow:
                    '0 4px 20px rgba(0, 0, 0, 0.035), 0 0 0 0.5px var(--color-border-tertiary)',
                }}
              >
                <div
                  className="w-full text-base outline-none opacity-50"
                  style={{
                    lineHeight: '1.4',
                    color: 'var(--color-text-tertiary)',
                  }}
                >
                  Reply to sunpeak...
                </div>
              </div>
            </div>
          </footer>
        )}
      </div>
    </div>
  );
}
