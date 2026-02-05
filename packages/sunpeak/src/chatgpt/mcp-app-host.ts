import {
  AppBridge,
  PostMessageTransport,
  type McpUiHostContext,
  type McpUiDisplayMode,
  type McpUiHostCapabilities,
  type McpUiToolInputNotification,
  type McpUiToolInputPartialNotification,
  type McpUiToolResultNotification,
  type McpUiToolCancelledNotification,
} from '@modelcontextprotocol/ext-apps/app-bridge';
import type {
  CallToolRequest,
  CallToolResult,
  LoggingMessageNotification,
} from '@modelcontextprotocol/sdk/types.js';

const HOST_INFO = { name: 'SunpeakSimulator', version: '1.0.0' };

const HOST_CAPABILITIES: McpUiHostCapabilities = {
  openLinks: {},
  serverTools: {},
  logging: {},
  updateModelContext: { text: {} },
  message: { text: {} },
};

export interface McpAppHostOptions {
  hostContext?: McpUiHostContext;
  onDisplayModeChange?: (mode: McpUiDisplayMode) => void;
  onMessage?: (role: string, content: unknown[]) => void;
  onOpenLink?: (url: string) => void;
  onUpdateModelContext?: (content: unknown[], structuredContent?: unknown) => void;
  onSizeChanged?: (params: { width?: number; height?: number }) => void;
  onLog?: (params: LoggingMessageNotification['params']) => void;
  onCallTool?: (params: CallToolRequest['params']) => CallToolResult | Promise<CallToolResult>;
}

/**
 * MCP Apps host for the Sunpeak simulator.
 * Wraps AppBridge to provide a simpler API for the simulator.
 * Connects to an iframe via PostMessageTransport.
 */
export class McpAppHost {
  private bridge: AppBridge;
  private options: McpAppHostOptions;
  private _initialized = false;
  private _contentWindow: Window | null = null;
  private _fenceId = 0;
  private _fenceCleanup: (() => void) | null = null;
  private _pendingToolInput: McpUiToolInputNotification['params'] | null = null;
  private _pendingToolResult: McpUiToolResultNotification['params'] | null = null;

  constructor(options: McpAppHostOptions = {}) {
    this.options = options;

    this.bridge = new AppBridge(null, HOST_INFO, HOST_CAPABILITIES, {
      hostContext: options.hostContext,
    });

    this.bridge.oninitialized = () => {
      this._initialized = true;

      // Flush any data that was sent before initialization completed
      if (this._pendingToolInput) {
        this.bridge.sendToolInput(this._pendingToolInput);
        this._pendingToolInput = null;
      }
      if (this._pendingToolResult) {
        this.bridge.sendToolResult(this._pendingToolResult);
        this._pendingToolResult = null;
      }
    };

    this.bridge.onopenlink = async ({ url }) => {
      console.log('[MCP App] openLink:', url);
      if (this.options.onOpenLink) {
        this.options.onOpenLink(url);
      } else {
        window.open(url, '_blank');
      }
      return {};
    };

    this.bridge.onmessage = async ({ role, content }) => {
      if (this.options.onMessage) {
        this.options.onMessage(role, content);
      } else {
        // Default: log to console
        console.log('[MCP App] sendMessage:', { role, content });
      }
      return {};
    };

    this.bridge.onrequestdisplaymode = async ({ mode }) => {
      this.options.onDisplayModeChange?.(mode);
      return { mode };
    };

    this.bridge.onupdatemodelcontext = async ({ content, structuredContent }) => {
      this.options.onUpdateModelContext?.(content ?? [], structuredContent);
      return {};
    };

    this.bridge.onsizechange = (params) => {
      this.options.onSizeChanged?.(params);
    };

    this.bridge.onloggingmessage = (params) => {
      if (this.options.onLog) {
        this.options.onLog(params);
      } else {
        // Default: log to console with appropriate level
        const level = params.level ?? 'info';
        const prefix = `[MCP App${params.logger ? ` ${params.logger}` : ''}]`;
        if (
          level === 'error' ||
          level === 'critical' ||
          level === 'alert' ||
          level === 'emergency'
        ) {
          console.error(prefix, params.data);
        } else if (level === 'warning') {
          console.warn(prefix, params.data);
        } else if (level === 'debug') {
          console.debug(prefix, params.data);
        } else {
          console.log(prefix, params.data);
        }
      }
    };

    this.bridge.oncalltool = async (params) => {
      if (this.options.onCallTool) {
        return this.options.onCallTool(params);
      }
      // Default: log to console and return empty result
      console.log('[MCP App] callServerTool:', params.name, params.arguments);
      return {
        content: [
          {
            type: 'text',
            text: `[Simulator] Tool "${params.name}" called (no handler configured)`,
          },
        ],
      };
    };
  }

  /**
   * Connect to an iframe's contentWindow.
   */
  async connectToIframe(contentWindow: Window): Promise<void> {
    this._contentWindow = contentWindow;
    const transport = new PostMessageTransport(contentWindow, contentWindow);
    await this.bridge.connect(transport);
  }

  /**
   * Wait for the iframe to process all pending messages and commit its DOM.
   *
   * Uses a postMessage fence: since messages to the same target are delivered
   * in FIFO order, a fence message sent after setHostContext is guaranteed to
   * be processed after the host context change. The iframe's fence responder
   * waits for requestAnimationFrame before acking, ensuring the DOM has been
   * committed for the re-render triggered by the context change.
   *
   * Returns immediately if the iframe is not connected.
   */
  waitForPaint(): Promise<void> {
    const win = this._contentWindow;
    if (!win) return Promise.resolve();

    // Cancel any previous pending fence
    this._fenceCleanup?.();

    const id = ++this._fenceId;

    return new Promise<void>((resolve) => {
      const handler = (event: MessageEvent) => {
        if (event.data?.method === 'sunpeak/fence-ack' && event.data.params?.fenceId === id) {
          cleanup();
          resolve();
        }
      };

      const cleanup = () => {
        window.removeEventListener('message', handler);
        if (this._fenceCleanup === cleanup) {
          this._fenceCleanup = null;
        }
      };

      this._fenceCleanup = cleanup;
      window.addEventListener('message', handler);

      try {
        // Format as a valid JSON-RPC 2.0 notification so the SDK's
        // PostMessageTransport parses it without error. Unknown notification
        // methods are silently ignored by the bridge.
        win.postMessage({ jsonrpc: '2.0', method: 'sunpeak/fence', params: { fenceId: id } }, '*');
      } catch {
        // Detached or cross-origin window
        cleanup();
        resolve();
      }
    });
  }

  /**
   * Update the host context and notify the connected app.
   */
  setHostContext(context: McpUiHostContext): void {
    this.bridge.setHostContext(context);
  }

  /**
   * Send tool input to the app.
   * If the app hasn't initialized yet, the input is queued.
   */
  sendToolInput(args: Record<string, unknown>): void {
    const params: McpUiToolInputNotification['params'] = { arguments: args };
    if (this._initialized) {
      this.bridge.sendToolInput(params);
    } else {
      this._pendingToolInput = params;
    }
  }

  /**
   * Send tool result to the app.
   * If the app hasn't initialized yet, the result is queued.
   */
  sendToolResult(result: CallToolResult): void {
    if (this._initialized) {
      this.bridge.sendToolResult(result);
    } else {
      this._pendingToolResult = result;
    }
  }

  /**
   * Send partial/streaming tool input to the app.
   * Useful for simulating streaming tool arguments.
   */
  sendToolInputPartial(args: Record<string, unknown>): void {
    const params: McpUiToolInputPartialNotification['params'] = { arguments: args };
    if (this._initialized) {
      this.bridge.sendToolInputPartial(params);
    }
    // Don't queue partials - they're only meaningful during streaming
  }

  /**
   * Send tool cancellation notification to the app.
   * Simulates user or host cancelling a tool execution.
   */
  sendToolCancelled(reason?: string): void {
    const params: McpUiToolCancelledNotification['params'] = reason ? { reason } : {};
    if (this._initialized) {
      this.bridge.sendToolCancelled(params);
    }
  }

  /**
   * Close the connection.
   */
  async close(): Promise<void> {
    this._fenceCleanup?.();
    this._fenceCleanup = null;
    try {
      if (this._initialized) {
        await this.bridge.teardownResource({});
      }
    } catch {
      // Ignore teardown errors
    }
    await this.bridge.close();
    this._initialized = false;
    this._contentWindow = null;
  }

  /**
   * Debug: Inject state directly into the app's useAppState hook.
   * This bypasses the normal MCP Apps protocol and is intended for
   * simulator testing/debugging only.
   */
  injectState(state: Record<string, unknown>): void {
    const win = this._contentWindow;
    if (!win) return;

    try {
      win.postMessage({ jsonrpc: '2.0', method: 'sunpeak/injectState', params: { state } }, '*');
    } catch {
      // Detached or cross-origin window - ignore
    }
  }

  get initialized(): boolean {
    return this._initialized;
  }
}
