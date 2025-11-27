import {
  type OpenAiGlobals,
  type OpenAiAPI,
  type Theme,
  type DisplayMode,
  type View,
  type ViewMode,
  type UnknownObject,
  SET_GLOBALS_EVENT_TYPE,
} from '../types';

class MockOpenAI implements OpenAiAPI, OpenAiGlobals {

  theme: Theme = 'light';
  userAgent: OpenAiGlobals['userAgent'] = {
    device: { type: 'desktop' },
    capabilities: {
      hover: true,
      touch: false,
    },
  };
  locale = 'en-US';
  maxHeight = 600;
  displayMode: DisplayMode = 'inline';
  safeArea = {
    insets: {
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
    },
  };
  view: View | null = null;
  toolInput: Record<string, unknown> = {};
  toolOutput: Record<string, unknown> | null = null;
  toolResponseMetadata: Record<string, unknown> | null = null;
  widgetState: Record<string, unknown> | null = null;

  async callTool(name: string, args: Record<string, unknown>) {
    console.log('Mock callTool:', name, args);
    return { result: JSON.stringify({ success: true }) };
  }

  async sendFollowUpMessage(args: { prompt: string }) {
    console.log('Mock sendFollowUpMessage:', args.prompt);
  }

  openExternal(payload: { href: string }) {
    console.log('Mock openExternal:', payload.href);
    window.open(payload.href, '_blank');
  }

  async requestDisplayMode(args: { mode: DisplayMode }) {
    this.setDisplayMode(args.mode);
    return { mode: args.mode };
  }

  async requestModal(args: { mode: ViewMode; params?: UnknownObject }) {
    console.log('Mock requestModal:', args);
    this.view = { mode: args.mode, params: args.params };
    this.emitUpdate({ view: this.view });
  }

  notifyIntrinsicHeight(height: number) {
    console.log('Mock notifyIntrinsicHeight:', height);
  }

  async setWidgetState(state: Record<string, unknown>) {
    this.widgetState = state;
    this.emitUpdate({ widgetState: state });
  }

  setTheme(theme: Theme) {
    this.theme = theme;
    this.emitUpdate({ theme });
  }

  setDisplayMode(displayMode: DisplayMode) {
    this.displayMode = displayMode;
    this.emitUpdate({ displayMode });
  }

  setToolOutput(toolOutput: Record<string, unknown> | null) {
    this.toolOutput = toolOutput;
    this.emitUpdate({ toolOutput });
  }

  setWidgetStateExternal(widgetState: Record<string, unknown> | null) {
    this.widgetState = widgetState;
    this.emitUpdate({ widgetState });
  }

  emitUpdate(globals: Partial<OpenAiGlobals>) {
    if (typeof window !== 'undefined') {
      // Defer event dispatch to avoid setState during render warnings
      queueMicrotask(() => {
        const event = new CustomEvent(SET_GLOBALS_EVENT_TYPE, {
          detail: { globals },
        });
        window.dispatchEvent(event);
      });
    }
  }
}

export function initMockOpenAI(initialData?: Partial<OpenAiGlobals>): MockOpenAI {
  if (typeof window !== 'undefined') {
    const mock = new MockOpenAI();

    // Set initial data on the mock object before registering
    if (initialData?.theme !== undefined) {
      mock.theme = initialData.theme;
    }
    if (initialData?.userAgent !== undefined) {
      mock.userAgent = initialData.userAgent;
    }
    if (initialData?.locale !== undefined) {
      mock.locale = initialData.locale;
    }
    if (initialData?.maxHeight !== undefined) {
      mock.maxHeight = initialData.maxHeight;
    }
    if (initialData?.displayMode !== undefined) {
      mock.displayMode = initialData.displayMode;
    }
    if (initialData?.safeArea !== undefined) {
      mock.safeArea = initialData.safeArea;
    }
    if (initialData?.view !== undefined) {
      mock.view = initialData.view;
    }
    if (initialData?.toolInput !== undefined) {
      mock.toolInput = initialData.toolInput;
    }
    if (initialData?.toolOutput !== undefined) {
      mock.toolOutput = initialData.toolOutput;
    }
    if (initialData?.toolResponseMetadata !== undefined) {
      mock.toolResponseMetadata = initialData.toolResponseMetadata;
    }
    if (initialData?.widgetState !== undefined) {
      mock.widgetState = initialData.widgetState;
    }

    // Register mock on window - data is already set
    (window as unknown as { openai: MockOpenAI }).openai = mock;

    return mock;
  }
  return new MockOpenAI();
}

export type { MockOpenAI };
