import type {
  McpUiDisplayMode,
  McpUiHostContext,
  McpUiHostCapabilities,
  McpUiStyles,
} from '@modelcontextprotocol/ext-apps';
import type { ScreenWidth } from './simulator-types';

type Platform = NonNullable<McpUiHostContext['platform']>;

/**
 * Props passed to a host shell (conversation chrome) component.
 * Each host implements a React component matching this interface.
 */
export interface HostConversationProps {
  /** The resource content (iframe or children) to render inside the conversation */
  children: React.ReactNode;
  /** Current simulated screen width */
  screenWidth: ScreenWidth;
  /** Current MCP display mode */
  displayMode: McpUiDisplayMode;
  /** Current platform (desktop/mobile/web) */
  platform: Platform;
  /** Callback when the shell requests a display mode change (e.g., close button) */
  onRequestDisplayMode?: (mode: McpUiDisplayMode) => void;
  /** App name for display in conversation chrome */
  appName?: string;
  /** App icon (emoji or URL) for display in conversation chrome */
  appIcon?: string;
  /** User message to show in the conversation (decorative) */
  userMessage?: string;
  /** Optional action element rendered in the conversation header (e.g., Run button in Prod Tools mode) */
  headerAction?: React.ReactNode;
  /**
   * Called when the content container width changes (via ResizeObserver).
   * The simulator uses this to set containerDimensions.maxWidth in hostContext,
   * matching what real hosts report to apps.
   */
  onContentWidthChange?: (width: number) => void;
}

/** Unique identifier for a host */
export type HostId = 'chatgpt' | 'claude' | (string & {});

/**
 * A registered host shell provides the conversation chrome and
 * functional configuration for a specific MCP App host.
 */
export interface HostShell {
  /** Unique host identifier */
  id: HostId;
  /** Human-readable name for the sidebar dropdown */
  label: string;
  /** The conversation shell React component */
  Conversation: React.ComponentType<HostConversationProps>;
  /** Apply the host's theme to the document (CSS variables, data attributes, etc.) */
  applyTheme: (theme: 'light' | 'dark') => void;
  /** Host info reported to the app via MCP protocol */
  hostInfo: { name: string; version: string };
  /** Host capabilities reported to the app via MCP protocol */
  hostCapabilities: McpUiHostCapabilities;
  /**
   * User agent string sent to the app via hostContext.userAgent.
   * Real hosts send identifiers like "chatgpt" or "claude".
   */
  userAgent?: string;
  /**
   * MCP App style variables sent to the app via hostContext.styles.variables.
   * Uses CSS light-dark() values so a single set adapts to theme automatically.
   * The SDK's applyDocumentTheme() sets color-scheme which light-dark() reads.
   * @see McpUiStyleVariableKey from @modelcontextprotocol/ext-apps
   */
  styleVariables?: McpUiStyles;
  /**
   * CSS custom properties for the simulator page chrome (sidebar, conversation area).
   * These are applied to the document root and can override the defaults:
   *   --sim-bg-sidebar       (fallback: var(--color-background-secondary))
   *   --sim-bg-conversation  (fallback: var(--color-background-primary))
   *
   * Values should use CSS light-dark() for automatic theme adaptation.
   */
  pageStyles?: Record<string, string>;
}

// ── Host Shell Registry ──────────────────────────────────────────

const registry = new Map<HostId, HostShell>();

/** Register a host shell. Idempotent — re-registering with the same id replaces. */
export function registerHostShell(shell: HostShell): void {
  registry.set(shell.id, shell);
}

/** Get a registered host shell by id. */
export function getHostShell(id: HostId): HostShell | undefined {
  return registry.get(id);
}

/** Get all registered host shells, in insertion order. */
export function getRegisteredHosts(): HostShell[] {
  return Array.from(registry.values());
}
