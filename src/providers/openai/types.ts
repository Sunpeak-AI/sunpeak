/**
 * OpenAI-specific types for the ChatGPT widget runtime.
 */

import type {
  UnknownObject,
  Theme,
  UserAgent,
  DisplayMode,
  ViewMode,
  View,
  SafeArea,
  CallToolResponse,
} from '../../types/runtime';

// OpenAI-specific type extensions
export type RequestDisplayMode = (args: { mode: DisplayMode }) => Promise<{
  mode: DisplayMode;
}>;

export type CallTool = (name: string, args: Record<string, unknown>) => Promise<CallToolResponse>;

export type OpenAiGlobals<
  ToolInput = UnknownObject,
  ToolOutput = UnknownObject,
  ToolResponseMetadata = UnknownObject,
  WidgetState = UnknownObject,
> = {
  theme: Theme;
  userAgent: UserAgent;
  locale: string;
  maxHeight: number | undefined;
  displayMode: DisplayMode;
  safeArea: SafeArea;
  view: View | null;
  toolInput: ToolInput;
  toolOutput: ToolOutput | null;
  toolResponseMetadata: ToolResponseMetadata | null;
  widgetState: WidgetState | null;
};

export type RequestModal = (args: { mode: ViewMode; params?: UnknownObject }) => Promise<void>;

export type NotifyIntrinsicHeight = (height: number) => void;

export type OpenAiAPI<WidgetState = UnknownObject> = {
  callTool: CallTool;
  sendFollowUpMessage: (args: { prompt: string }) => Promise<void>;
  openExternal(payload: { href: string }): void;
  requestDisplayMode: RequestDisplayMode;
  requestModal: RequestModal;
  notifyIntrinsicHeight: NotifyIntrinsicHeight;
  setWidgetState: (state: WidgetState) => Promise<void>;
};

export const SET_GLOBALS_EVENT_TYPE = 'openai:set_globals';

export class SetGlobalsEvent extends CustomEvent<{
  globals: Partial<OpenAiGlobals>;
}> {
  readonly type = SET_GLOBALS_EVENT_TYPE;
}

declare global {
  interface Window {
    openai: OpenAiAPI & OpenAiGlobals;
  }

  interface WindowEventMap {
    [SET_GLOBALS_EVENT_TYPE]: SetGlobalsEvent;
  }
}
