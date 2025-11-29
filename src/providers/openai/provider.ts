/**
 * OpenAI/ChatGPT provider implementation.
 * Bridges the OpenAI-specific window.openai API to the provider-agnostic interface.
 */

import type { WidgetProvider, WidgetGlobals, WidgetAPI } from '../types';
import { SET_GLOBALS_EVENT_TYPE, type SetGlobalsEvent } from './types';

/**
 * Check if the OpenAI provider is available.
 */
export function isOpenAiAvailable(): boolean {
  return typeof window !== 'undefined' && window.openai != null;
}

/**
 * OpenAI provider implementation.
 */
class OpenAiProvider implements WidgetProvider {
  readonly id = 'openai';

  getGlobal<K extends keyof WidgetGlobals>(key: K): WidgetGlobals[K] | null {
    if (typeof window === 'undefined' || !window.openai) {
      return null;
    }
    return window.openai[key] ?? null;
  }

  subscribe(key: keyof WidgetGlobals, onChange: () => void): () => void {
    if (typeof window === 'undefined') {
      return () => {};
    }

    // Listen to OpenAI set_globals events
    const handleEvent = (event: SetGlobalsEvent) => {
      if (event.detail.globals[key] !== undefined) {
        onChange();
      }
    };

    window.addEventListener(SET_GLOBALS_EVENT_TYPE, handleEvent, {
      passive: true,
    });

    return () => {
      window.removeEventListener(SET_GLOBALS_EVENT_TYPE, handleEvent);
    };
  }

  getAPI(): WidgetAPI | null {
    if (typeof window === 'undefined' || !window.openai) {
      return null;
    }

    const api = window.openai;
    return {
      callTool: api.callTool?.bind(api),
      sendFollowUpMessage: api.sendFollowUpMessage?.bind(api),
      openExternal: api.openExternal?.bind(api),
      requestDisplayMode: api.requestDisplayMode?.bind(api),
      requestModal: api.requestModal?.bind(api),
      notifyIntrinsicHeight: api.notifyIntrinsicHeight?.bind(api),
      setWidgetState: api.setWidgetState?.bind(api),
    };
  }
}

// Singleton instance
let openAiProvider: OpenAiProvider | null = null;

/**
 * Get the OpenAI provider instance (singleton).
 */
export function getOpenAiProvider(): OpenAiProvider {
  if (!openAiProvider) {
    openAiProvider = new OpenAiProvider();
  }
  return openAiProvider;
}
