import type { McpUiHostCapabilities } from '@modelcontextprotocol/ext-apps';
import { registerHostShell } from '../simulator/hosts';
import { DEFAULT_STYLE_VARIABLES } from '../simulator/host-styles';
import { Conversation } from './chatgpt-conversation';

/**
 * ChatGPT host version info — matches what ChatGPT reports via the MCP protocol.
 * Verified via host-inspector extraction on 2026-03-19.
 */
const CHATGPT_HOST_INFO = {
  name: 'chatgpt',
  version: '0.0.1',
};

const CHATGPT_HOST_CAPABILITIES: McpUiHostCapabilities = {
  openLinks: {},
  serverTools: {},
  serverResources: {},
  logging: {},
  updateModelContext: {},
  message: {},
  sandbox: {
    permissions: {
      microphone: {},
    },
  },
};

/**
 * Apply ChatGPT-style theming to the document.
 * Sets data-theme attribute and color-scheme for light-dark() CSS support.
 */
function applyChatGPTTheme(theme: 'light' | 'dark'): void {
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.style.colorScheme = theme;
}

/**
 * ChatGPT style variables — matches SDK defaults exactly.
 * Verified via host-inspector extraction on 2026-03-19.
 */
const CHATGPT_STYLE_VARIABLES = {
  ...DEFAULT_STYLE_VARIABLES,
};

registerHostShell({
  id: 'chatgpt',
  label: 'ChatGPT',
  Conversation,
  applyTheme: applyChatGPTTheme,
  hostInfo: CHATGPT_HOST_INFO,
  hostCapabilities: CHATGPT_HOST_CAPABILITIES,
  userAgent: 'chatgpt',
  styleVariables: CHATGPT_STYLE_VARIABLES,
  pageStyles: {
    '--sim-bg-sidebar': 'light-dark(#ffffff, #212121)',
    '--sim-bg-conversation': 'light-dark(#ffffff, #212121)',
    '--sim-bg-user-bubble': 'light-dark(rgba(233,233,233,0.5), rgba(50,50,50,0.85))',
    '--sim-bg-reply-input': 'light-dark(#ffffff, #212121)',
  },
});
