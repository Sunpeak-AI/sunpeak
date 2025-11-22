import { useMemo } from 'react';
import type { OpenAiAPI } from '../types';

export function useOpenAiAPI(): OpenAiAPI | null {
  return useMemo(() => {
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
    };
  }, []);
}
