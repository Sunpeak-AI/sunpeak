import {
  type OpenAiGlobals,
  type OpenAiAPI,
  type Theme,
  type DisplayMode,
  SET_GLOBALS_EVENT_TYPE,
} from '../../types';

class MockOpenAI implements OpenAiAPI, OpenAiGlobals {

  theme: Theme = 'light';
  userAgent = {
    device: { type: 'desktop' as const },
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
  toolInput = {};
  toolOutput = null;
  toolResponseMetadata = null;
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

  private emitUpdate(globals: Partial<OpenAiGlobals>) {
    if (typeof window !== 'undefined') {
      const event = new CustomEvent(SET_GLOBALS_EVENT_TYPE, {
        detail: { globals },
      });
      window.dispatchEvent(event);
    }
  }
}

export function initMockOpenAI(): MockOpenAI {
  if (typeof window !== 'undefined') {
    const mock = new MockOpenAI();
    (window as unknown as { openai: MockOpenAI }).openai = mock;
    return mock;
  }
  return new MockOpenAI();
}

export type { MockOpenAI };
