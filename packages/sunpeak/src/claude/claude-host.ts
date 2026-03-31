import type { McpUiHostCapabilities } from '@modelcontextprotocol/ext-apps';
import { registerHostShell } from '../inspector/hosts';
import { DEFAULT_STYLE_VARIABLES } from '../inspector/host-styles';
import { ClaudeConversation } from './claude-conversation';

/**
 * Claude host version info — matches what Claude reports via the MCP protocol.
 * Verified against production Claude on 2026-03-30.
 */
const CLAUDE_HOST_INFO = {
  name: 'Claude',
  version: '1.0.0',
};

/**
 * Claude host capabilities — matches what Claude reports via the MCP protocol.
 * Verified against production Claude on 2026-03-30.
 *
 * Notable: Claude supports downloadFile, updateModelContext.image, and
 * message.text. serverTools and serverResources both report listChanged.
 * No sandbox.permissions (no microphone etc.). No PiP display mode.
 */
const CLAUDE_HOST_CAPABILITIES: McpUiHostCapabilities = {
  openLinks: {},
  downloadFile: {},
  serverTools: { listChanged: true },
  serverResources: { listChanged: true },
  logging: {},
  updateModelContext: { text: {}, image: {} },
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
 * Claude style variable overrides — warm beige/cream palette with Anthropic Sans.
 * Verified against production Claude on 2026-03-30.
 *
 * Only overrides values that differ from DEFAULT_STYLE_VARIABLES.
 * Claude sends all variables via styles.variables using light-dark(rgba()) format.
 */
const CLAUDE_STYLE_VARIABLES = {
  ...DEFAULT_STYLE_VARIABLES,

  // ── Background colors ──
  '--color-background-primary': 'light-dark(rgba(255, 255, 255, 1), rgba(48, 48, 46, 1))',
  '--color-background-secondary': 'light-dark(rgba(245, 244, 237, 1), rgba(38, 38, 36, 1))',
  '--color-background-tertiary': 'light-dark(rgba(250, 249, 245, 1), rgba(20, 20, 19, 1))',
  '--color-background-inverse': 'light-dark(rgba(20, 20, 19, 1), rgba(250, 249, 245, 1))',
  '--color-background-ghost': 'light-dark(rgba(255, 255, 255, 0), rgba(48, 48, 46, 0))',
  '--color-background-info': 'light-dark(rgba(214, 228, 246, 1), rgba(37, 62, 95, 1))',
  '--color-background-danger': 'light-dark(rgba(247, 236, 236, 1), rgba(96, 42, 40, 1))',
  '--color-background-success': 'light-dark(rgba(233, 241, 220, 1), rgba(27, 70, 20, 1))',
  '--color-background-warning': 'light-dark(rgba(246, 238, 223, 1), rgba(72, 58, 15, 1))',
  '--color-background-disabled': 'light-dark(rgba(255, 255, 255, 0.5), rgba(48, 48, 46, 0.5))',

  // ── Text colors ──
  '--color-text-primary': 'light-dark(rgba(20, 20, 19, 1), rgba(250, 249, 245, 1))',
  '--color-text-secondary': 'light-dark(rgba(61, 61, 58, 1), rgba(194, 192, 182, 1))',
  '--color-text-tertiary': 'light-dark(rgba(115, 114, 108, 1), rgba(156, 154, 146, 1))',
  '--color-text-inverse': 'light-dark(rgba(255, 255, 255, 1), rgba(20, 20, 19, 1))',
  '--color-text-ghost': 'light-dark(rgba(115, 114, 108, 0.5), rgba(156, 154, 146, 0.5))',
  '--color-text-info': 'light-dark(rgba(50, 102, 173, 1), rgba(128, 170, 221, 1))',
  '--color-text-danger': 'light-dark(rgba(127, 44, 40, 1), rgba(238, 136, 132, 1))',
  '--color-text-success': 'light-dark(rgba(38, 91, 25, 1), rgba(122, 185, 72, 1))',
  '--color-text-warning': 'light-dark(rgba(90, 72, 21, 1), rgba(209, 160, 65, 1))',
  '--color-text-disabled': 'light-dark(rgba(20, 20, 19, 0.5), rgba(250, 249, 245, 0.5))',

  // ── Border colors ──
  '--color-border-primary': 'light-dark(rgba(31, 30, 29, 0.4), rgba(222, 220, 209, 0.4))',
  '--color-border-secondary': 'light-dark(rgba(31, 30, 29, 0.3), rgba(222, 220, 209, 0.3))',
  '--color-border-tertiary': 'light-dark(rgba(31, 30, 29, 0.15), rgba(222, 220, 209, 0.15))',
  '--color-border-inverse': 'light-dark(rgba(255, 255, 255, 0.3), rgba(20, 20, 19, 0.15))',
  '--color-border-ghost': 'light-dark(rgba(31, 30, 29, 0), rgba(222, 220, 209, 0))',
  '--color-border-info': 'light-dark(rgba(70, 130, 213, 1), rgba(70, 130, 213, 1))',
  '--color-border-danger': 'light-dark(rgba(167, 61, 57, 1), rgba(205, 92, 88, 1))',
  '--color-border-success': 'light-dark(rgba(67, 116, 38, 1), rgba(89, 145, 48, 1))',
  '--color-border-warning': 'light-dark(rgba(128, 92, 31, 1), rgba(168, 120, 41, 1))',
  '--color-border-disabled': 'light-dark(rgba(31, 30, 29, 0.1), rgba(222, 220, 209, 0.1))',

  // ── Ring colors ──
  '--color-ring-primary': 'light-dark(rgba(20, 20, 19, 0.7), rgba(250, 249, 245, 0.7))',
  '--color-ring-secondary': 'light-dark(rgba(61, 61, 58, 0.7), rgba(194, 192, 182, 0.7))',
  '--color-ring-inverse': 'light-dark(rgba(255, 255, 255, 0.7), rgba(20, 20, 19, 0.7))',
  '--color-ring-info': 'light-dark(rgba(50, 102, 173, 0.5), rgba(128, 170, 221, 0.5))',
  '--color-ring-danger': 'light-dark(rgba(167, 61, 57, 0.5), rgba(205, 92, 88, 0.5))',
  '--color-ring-success': 'light-dark(rgba(67, 116, 38, 0.5), rgba(89, 145, 48, 0.5))',
  '--color-ring-warning': 'light-dark(rgba(128, 92, 31, 0.5), rgba(168, 120, 41, 0.5))',

  // ── Typography ──
  '--font-sans': '"Anthropic Sans", system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  '--font-mono': 'ui-monospace, monospace',
  // Sizes (px, not rem — Claude uses fixed px values)
  '--font-text-xs-size': '12px',
  '--font-text-sm-size': '14px',
  '--font-text-md-size': '16px',
  '--font-text-lg-size': '20px',
  '--font-heading-xs-size': '12px',
  '--font-heading-sm-size': '14px',
  '--font-heading-md-size': '16px',
  '--font-heading-lg-size': '20px',
  '--font-heading-xl-size': '24px',
  '--font-heading-2xl-size': '28px',
  '--font-heading-3xl-size': '36px',
  // Line heights
  '--font-text-md-line-height': '1.4',
  '--font-text-lg-line-height': '1.25',
  '--font-heading-lg-line-height': '1.25',
  '--font-heading-2xl-line-height': '1.1',
  '--font-heading-3xl-line-height': '1',

  // ── Border radius (Claude uses slightly larger values) ──
  '--border-radius-xs': '4px',
  '--border-radius-sm': '6px',
  '--border-radius-md': '8px',
  '--border-radius-lg': '10px',

  // ── Border width ──
  '--border-width-regular': '0.5px',
};

registerHostShell({
  id: 'claude',
  label: 'Claude',
  Conversation: ClaudeConversation,
  applyTheme: applyClaudeTheme,
  hostInfo: CLAUDE_HOST_INFO,
  hostCapabilities: CLAUDE_HOST_CAPABILITIES,
  styleVariables: CLAUDE_STYLE_VARIABLES,
  pageStyles: {
    '--sim-bg-sidebar': 'light-dark(rgb(250, 249, 245), rgb(38, 38, 36))',
    '--sim-bg-conversation': 'light-dark(rgb(250, 249, 245), rgb(38, 38, 36))',
    '--sim-bg-user-bubble': 'light-dark(rgb(240, 238, 230), rgb(20, 20, 19))',
    '--sim-bg-reply-input': 'light-dark(rgb(255, 255, 255), rgb(48, 48, 46))',
  },
  safeAreaByDisplayMode: {
    inline: {},
    fullscreen: { top: 16, right: 16, bottom: 138, left: 16 },
  },
  availableDisplayModes: ['inline', 'fullscreen'],
  fontCss: `@font-face {
  font-family: "Anthropic Sans";
  src: url("https://assets-proxy.anthropic.com/claude-ai/v2/assets/v1/cc27851ad-CFxw3nG7.woff2") format("woff2");
  font-weight: 300 800;
  font-style: normal;
  font-display: swap;
  font-feature-settings: "dlig" 0;
}
@font-face {
  font-family: "Anthropic Sans";
  src: url("https://assets-proxy.anthropic.com/claude-ai/v2/assets/v1/c9d3a3a49-BI1hrwN4.woff2") format("woff2");
  font-weight: 300 800;
  font-style: italic;
  font-display: swap;
  font-feature-settings: "dlig" 0;
}`,
});
