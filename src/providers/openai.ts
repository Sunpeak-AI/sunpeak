/**
 * OpenAI/ChatGPT provider implementation.
 * Bridges the OpenAI-specific window.openai API to the provider-agnostic interface.
 */

import type { WidgetProvider, WidgetGlobals, WidgetAPI } from './types';
import {
  SET_GLOBALS_EVENT_TYPE,
  type SetGlobalsEvent,
} from '../types/openai';

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

    return {
      callTool: window.openai.callTool.bind(window.openai),
      sendFollowUpMessage: window.openai.sendFollowUpMessage.bind(window.openai),
      openExternal: window.openai.openExternal.bind(window.openai),
      requestDisplayMode: window.openai.requestDisplayMode.bind(window.openai),
      requestModal: window.openai.requestModal.bind(window.openai),
      notifyIntrinsicHeight: window.openai.notifyIntrinsicHeight.bind(window.openai),
      setWidgetState: window.openai.setWidgetState.bind(window.openai),
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
