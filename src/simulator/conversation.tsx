import * as React from 'react';
import { SCREEN_WIDTHS, type ScreenWidth } from '../types/simulator';

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
  appName = 'ChatGPT',
  appIcon,
  userMessage = 'Show me some interesting places to visit.'
}: ConversationProps) {
  const width = SCREEN_WIDTHS[screenWidth];

  return (
    <div className="flex-1 flex flex-col bg-[var(--sp-color-bg-primary)]">
      <div className="flex-1 overflow-auto">
        <div className="py-8">
          <div className="max-w-3xl mx-auto px-6">
            <h4 className="text-xl font-semibold text-[var(--sp-color-text-primary)] mb-6">
              ChatGPT
            </h4>

            <div className="space-y-6">
              <div className="flex justify-end">
                <div className="max-w-[80%] bg-[var(--sp-color-bg-secondary)] text-[var(--sp-color-text-primary)] rounded-2xl px-5 py-3">
                  {userMessage}
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  {appIcon ? (
                    <div className="w-8 h-8 flex items-center justify-center text-xl">
                      {appIcon}
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[var(--sp-accent)] flex items-center justify-center text-white font-medium text-sm">
                      AI
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="text-[var(--sp-color-text-primary)] mb-3 font-medium">
                    {appName}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="pl-[calc((100vw-768px)/2+24px+32px+12px)] pr-6 mt-3">
            {children}
          </div>
        </div>
      </div>

      <div className="border-t border-[var(--sp-color-border)] bg-[var(--sp-color-bg-primary)]">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="relative">
            <input
              type="text"
              disabled
              placeholder="Message ChatGPT"
              className="w-full bg-[var(--sp-color-bg-secondary)] text-[var(--sp-color-text-primary)] placeholder-[var(--sp-color-text-tertiary)] rounded-3xl px-5 py-3 pr-12 outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
