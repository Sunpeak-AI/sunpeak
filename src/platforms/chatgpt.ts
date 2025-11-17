/**
 * OpenAI ChatGPT Apps SDK Platform Adapter
 *
 * Implements the PlatformAdapter interface for OpenAI's ChatGPT Apps SDK.
 * https://developers.openai.com/apps-sdk
 */

import type { PlatformAdapter, PlatformGlobals } from '../types/platform';
import { SET_GLOBALS_EVENT_TYPE, type SetGlobalsEvent } from '../types/chatgpt';

export class ChatGPTPlatformAdapter implements PlatformAdapter {
  readonly name = 'chatgpt';

  isAvailable(): boolean {
    return typeof window !== 'undefined' && 'openai' in window;
  }

  getGlobal<K extends keyof PlatformGlobals>(key: K): PlatformGlobals[K] | null {
    if (!this.isAvailable()) {
      return null;
    }
    return (window.openai?.[key] as PlatformGlobals[K]) ?? null;
  }

  getGlobals() {
    if (!this.isAvailable()) {
      return null;
    }
    return window.openai ?? null;
  }

  subscribe(callback: () => void): () => void {
    if (typeof window === 'undefined') {
      return () => {};
    }

    const handleSetGlobal = (_event: SetGlobalsEvent) => {
      callback();
    };

    window.addEventListener(SET_GLOBALS_EVENT_TYPE, handleSetGlobal, {
      passive: true,
    });

    return () => {
      window.removeEventListener(SET_GLOBALS_EVENT_TYPE, handleSetGlobal);
    };
  }
}

/**
 * Singleton instance of the ChatGPT platform adapter
 */
export const chatgptPlatform = new ChatGPTPlatformAdapter();
