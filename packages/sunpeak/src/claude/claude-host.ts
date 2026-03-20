import type { McpUiHostCapabilities } from '@modelcontextprotocol/ext-apps';
import { registerHostShell } from '../simulator/hosts';
import { DEFAULT_STYLE_VARIABLES } from '../simulator/host-styles';
import { ClaudeConversation } from './claude-conversation';

const CLAUDE_HOST_INFO = {
  name: 'Claude',
  version: '1.0.0',
};

const CLAUDE_HOST_CAPABILITIES: McpUiHostCapabilities = {
  openLinks: {},
  serverTools: {},
  serverResources: {},
  downloadFile: {},
  logging: {},
  updateModelContext: { text: {} },
  message: { text: {} },
  sandbox: {},
};

/**
 * Apply Claude-style theming to the document.
 * Sets data-theme attribute and color-scheme so CSS light-dark() resolves correctly.
 */
function applyClaudeTheme(theme: 'light' | 'dark'): void {
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.style.colorScheme = theme;
}

/**
 * Claude-specific style variable overrides (warm beige/cream palette).
 * Inherits defaults from DEFAULT_STYLE_VARIABLES, overriding only colors.
 */
const CLAUDE_STYLE_VARIABLES = {
  ...DEFAULT_STYLE_VARIABLES,
  // Background colors — warm beige/cream palette
  '--color-background-primary': 'light-dark(#faf9f5, #262624)',
  '--color-background-secondary': 'light-dark(#ffffff, #3a3935)',
  '--color-background-tertiary': 'light-dark(#e8e4dc, #4a4843)',
  '--color-background-inverse': 'light-dark(#2b2a27, #f3f0e8)',
  // Text colors
  '--color-text-primary': 'light-dark(#2d2b27, #e8e4dc)',
  '--color-text-secondary': 'light-dark(#6b6560, #9b9690)',
  '--color-text-tertiary': 'light-dark(#9b9690, #6b6560)',
  '--color-text-inverse': 'light-dark(#e8e4dc, #2d2b27)',
  // Border colors
  '--color-border-primary': 'light-dark(#e0ddd5, #4a4843)',
  '--color-border-secondary': 'light-dark(#d5d1c8, #5a5753)',
  '--color-border-tertiary': 'light-dark(#f0ede5, #3a3935)',
};

registerHostShell({
  id: 'claude',
  label: 'Claude',
  Conversation: ClaudeConversation,
  applyTheme: applyClaudeTheme,
  hostInfo: CLAUDE_HOST_INFO,
  hostCapabilities: CLAUDE_HOST_CAPABILITIES,
  userAgent: 'claude',
  styleVariables: CLAUDE_STYLE_VARIABLES,
  pageStyles: {
    '--sim-bg-sidebar': 'light-dark(#f9f8f3, #252523)',
    '--sim-bg-conversation': 'light-dark(#faf9f5, #262624)',
    '--sim-bg-user-bubble': 'light-dark(#f1eee6, #141413)',
    '--sim-bg-reply-input': 'light-dark(#ffffff, #30302e)',
  },
});
