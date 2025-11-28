/**
 * OpenAI/ChatGPT provider implementation.
 * This module provides the OpenAI-specific implementation of the WidgetProvider interface.
 */

export { isOpenAiAvailable, getOpenAiProvider } from './provider';
export type {
  OpenAiGlobals,
  OpenAiAPI,
  CallTool,
  RequestDisplayMode,
  RequestModal,
  NotifyIntrinsicHeight,
  SetGlobalsEvent,
} from './types';
export { SET_GLOBALS_EVENT_TYPE } from './types';
