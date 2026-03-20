import * as React from 'react';
import { useEffect, useRef, useMemo, useCallback } from 'react';
import { McpAppHost, type McpAppHostOptions } from './mcp-app-host';
import { MOCK_OPENAI_RUNTIME_SCRIPT } from './mock-openai-runtime';
import { generateSandboxProxyHtml } from './sandbox-proxy';
import type { McpUiHostContext, McpUiResourcePermissions } from '@modelcontextprotocol/ext-apps';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

/**
 * Allowed origins for cross-origin script loading.
 * - Local development: localhost, 127.0.0.1, file://
 * - Production: sunpeak-prod-app-storage.s3.us-east-2.amazonaws.com (serves user scripts)
 */
const ALLOWED_SCRIPT_ORIGINS = [
  'https://sunpeak-prod-app-storage.s3.us-east-2.amazonaws.com',
  'http://localhost',
  'https://localhost',
  'http://127.0.0.1',
  'https://127.0.0.1',
];

/**
 * Escapes HTML special characters to prevent XSS via attribute injection.
 */
function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, (c) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[c] ?? c;
  });
}

/**
 * Validates that a URL is from an allowed origin.
 * Allows same-origin URLs and URLs from whitelisted domains.
 */
function isAllowedUrl(src: string): boolean {
  if (!src) return false;

  // Allow relative paths (same-origin) - must start with / but not //
  if (src.startsWith('/') && !src.startsWith('//')) return true;

  // Reject strings that don't look like URLs (no protocol)
  if (!src.includes('://')) return false;

  try {
    const url = new URL(src);

    // Allow same-origin
    if (url.origin === window.location.origin) return true;

    // Allow localhost with any port for development
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return true;

    // Check against allowed origins (strict origin comparison only)
    return ALLOWED_SCRIPT_ORIGINS.some((allowed) => {
      try {
        return url.origin === new URL(allowed).origin;
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  }
}

/**
 * Content Security Policy configuration for iframe resources.
 * Matches McpUiResourceCsp from the MCP Apps spec.
 */
export interface ResourceCSP {
  /** Domains allowed for fetch/XHR/WebSocket connections */
  connectDomains?: string[];
  /** Domains allowed for scripts, images, styles, fonts */
  resourceDomains?: string[];
  /** Domains allowed for nested iframes */
  frameDomains?: string[];
  /** Domains allowed for the base-uri directive */
  baseUriDomains?: string[];
}

/**
 * Extract CSP configuration from a resource's _meta.ui.csp field.
 */
export function extractResourceCSP(resource: { _meta?: unknown }): ResourceCSP | undefined {
  const meta = resource._meta as Record<string, unknown> | undefined;
  const ui = meta?.ui as { csp?: ResourceCSP } | undefined;
  return ui?.csp;
}

/**
 * Validates a CSP source entry is a safe origin URL (scheme + host + optional port).
 * Rejects wildcards, CSP keywords, and whitespace that could inject extra directives.
 */
function isValidCspSource(source: string): boolean {
  // Block CSP keywords like 'unsafe-inline', wildcards like *, and whitespace injection
  if (!source || /[\s;,']/.test(source) || source === '*') return false;
  try {
    const url = new URL(source);
    return (
      url.protocol === 'http:' ||
      url.protocol === 'https:' ||
      url.protocol === 'ws:' ||
      url.protocol === 'wss:'
    );
  } catch {
    return false;
  }
}

/**
 * Generates a Content Security Policy string.
 */
function generateCSP(csp: ResourceCSP | undefined, scriptSrc: string): string {
  let scriptOrigin = '';
  try {
    scriptOrigin = new URL(scriptSrc, window.location.origin).origin;
  } catch {
    // Invalid URL, skip
  }

  // frame-src: default to 'none', but allow declared frame domains
  const frameSources = new Set<string>();
  if (csp?.frameDomains) {
    for (const domain of csp.frameDomains) {
      if (isValidCspSource(domain)) {
        frameSources.add(domain);
      } else {
        console.warn('[IframeResource] Ignoring invalid CSP frame domain:', domain);
      }
    }
  }
  const frameSrc =
    frameSources.size > 0 ? `frame-src ${Array.from(frameSources).join(' ')}` : "frame-src 'none'";

  // base-uri: default to 'self', but allow declared base-uri domains
  const baseSources = new Set<string>(["'self'"]);
  if (csp?.baseUriDomains) {
    for (const domain of csp.baseUriDomains) {
      if (isValidCspSource(domain)) {
        baseSources.add(domain);
      } else {
        console.warn('[IframeResource] Ignoring invalid CSP base-uri domain:', domain);
      }
    }
  }

  const directives: string[] = [
    "default-src 'none'",
    `script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: ${scriptOrigin}`.trim(),
    `style-src 'self' 'unsafe-inline' ${scriptOrigin}`.trim(),
    frameSrc,
    "object-src 'none'",
    "form-action 'none'",
    `base-uri ${Array.from(baseSources).join(' ')}`,
  ];

  const connectSources = new Set<string>(["'self'"]);
  if (scriptOrigin) connectSources.add(scriptOrigin);
  if (csp?.connectDomains) {
    for (const domain of csp.connectDomains) {
      if (isValidCspSource(domain)) {
        connectSources.add(domain);
      } else {
        console.warn('[IframeResource] Ignoring invalid CSP connect domain:', domain);
      }
    }
  }
  directives.push(`connect-src ${Array.from(connectSources).join(' ')}`);

  const resourceSources = new Set<string>(["'self'", 'data:', 'blob:']);
  if (scriptOrigin) resourceSources.add(scriptOrigin);
  if (csp?.resourceDomains) {
    for (const domain of csp.resourceDomains) {
      if (isValidCspSource(domain)) {
        resourceSources.add(domain);
      } else {
        console.warn('[IframeResource] Ignoring invalid CSP resource domain:', domain);
      }
    }
  }
  const resourceList = Array.from(resourceSources).join(' ');
  directives.push(`img-src ${resourceList}`);
  directives.push(`font-src ${resourceList}`);
  directives.push(`media-src ${resourceList}`);

  return directives.join('; ');
}

/**
 * Paint fence responder script body.
 * Embedded in the generated HTML for scriptSrc mode. The sandbox proxy
 * handles fence injection for src-mode iframes.
 */
const PAINT_FENCE_SCRIPT = `window.addEventListener("message",function(e){
if(e.data&&e.data.method==="sunpeak/fence"){
var fid=e.data.params&&e.data.params.fenceId;
requestAnimationFrame(function(){
e.source.postMessage({jsonrpc:"2.0",method:"sunpeak/fence-ack",params:{fenceId:fid}},"*");
});}});`;

/**
 * Generates HTML wrapper for a script URL.
 * The MCP Apps SDK in the loaded script handles communication via PostMessageTransport.
 */
function generateScriptHtml(
  scriptSrc: string,
  theme: string,
  cspPolicy: string,
  platformScript?: string
): string {
  const safeScriptSrc = escapeHtml(scriptSrc);
  const safeCsp = escapeHtml(cspPolicy);
  const safeTheme = escapeHtml(theme);
  // Platform runtime script (e.g. mock window.openai) runs before the app
  // script so that isChatGPT() and platform hooks work from first render.
  const platformTag = platformScript ? `\n  <script>${platformScript}</script>` : '';
  return `<!DOCTYPE html>
<html lang="en" data-theme="${safeTheme}" style="color-scheme:${safeTheme};background:Canvas">
<head>
  <meta charset="UTF-8" />
  <meta name="color-scheme" content="${safeTheme}" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy" content="${safeCsp}" />
  <title>Resource</title>
  <style>
    html {
      /* Use the MCP App background variable once JS sets it, otherwise
         Canvas (the system color that auto-adapts to color-scheme). */
      background-color: var(--color-background-primary, Canvas);
    }
    body, #root {
      margin: 0;
      padding: 0;
      width: 100%;
      background: transparent;
    }
  </style>
  <script>${PAINT_FENCE_SCRIPT}</script>${platformTag}
</head>
<body>
  <div id="root"></div>
  <script src="${safeScriptSrc}"></script>
</body>
</html>`;
}

/**
 * Build the iframe `allow` attribute from resource-declared permissions.
 * Maps McpUiResourcePermissions to Permission Policy directives and
 * combines them with simulator baseline permissions.
 */
function buildIframeAllow(permissions: McpUiResourcePermissions | undefined): string {
  const parts: string[] = [
    'local-network-access *', // Always needed for local dev server access
  ];

  // Map spec permissions to their Permission Policy names
  const permMap: [keyof McpUiResourcePermissions, string][] = [
    ['camera', 'camera'],
    ['microphone', 'microphone'],
    ['geolocation', 'geolocation'],
    ['clipboardWrite', 'clipboard-write'],
  ];

  for (const [key, directive] of permMap) {
    if (permissions?.[key]) {
      parts.push(directive);
    }
  }

  return parts.join('; ');
}

interface IframeResourceProps {
  /**
   * URL to an HTML page to load directly in the iframe.
   * Used for dev mode where Vite serves the resource page.
   * Mutually exclusive with scriptSrc.
   */
  src?: string;
  /**
   * URL to a built resource to load in the iframe via srcdoc.
   * Used for production builds where we generate the HTML wrapper.
   * Mutually exclusive with src.
   */
  scriptSrc?: string;
  /** Initial host context for the MCP Apps bridge */
  hostContext?: McpUiHostContext;
  /** Tool input arguments to send after connection */
  toolInput?: Record<string, unknown>;
  /** Partial/streaming tool input to send as a tool-input-partial notification */
  toolInputPartial?: Record<string, unknown>;
  /** Tool result to send after connection */
  toolResult?: CallToolResult;
  /** Optional callbacks for the MCP Apps host */
  hostOptions?: McpAppHostOptions;
  /** Optional CSP configuration (only used with scriptSrc) */
  csp?: ResourceCSP;
  /** Resource-declared sandbox permissions (camera, microphone, etc.) */
  permissions?: McpUiResourcePermissions;
  /** Whether the host should render a border around the resource */
  prefersBorder?: boolean;
  /** Optional className for the iframe container */
  className?: string;
  /** Optional style for the iframe */
  style?: React.CSSProperties;
  /**
   * Called after the iframe has rendered following a display mode change.
   * The callback receives the display mode that was confirmed.
   * Used by the simulator to hide content during transitions and only
   * reveal it once the app has committed its DOM for the new mode.
   */
  onDisplayModeReady?: (mode: string) => void;
  /**
   * Debug: State to inject directly into the app's useAppState hook.
   * This bypasses the normal MCP Apps protocol and is for simulator testing.
   */
  debugInjectState?: Record<string, unknown> | null;
  /**
   * Whether to inject a mock ChatGPT runtime (window.openai) into the iframe.
   * When true, ChatGPT-specific hooks (useUploadFile, useRequestModal, etc.)
   * and isChatGPT() will work inside the iframe.
   */
  injectOpenAIRuntime?: boolean;
  /**
   * Base URL of the separate-origin sandbox server (e.g., "http://localhost:24680").
   * When provided, the outer iframe loads from this server instead of using srcdoc,
   * giving real cross-origin isolation that matches production hosts like ChatGPT.
   * Falls back to srcdoc when not provided (unit tests, embedded usage).
   */
  sandboxUrl?: string;
}

/**
 * IframeResource renders MCP Apps in an iframe, communicating via the
 * MCP Apps protocol (PostMessageTransport + AppBridge).
 *
 * Supports two modes:
 * - `src`: Load an HTML page directly (dev mode with Vite HMR)
 * - `scriptSrc`: Generate HTML wrapper for a JS file (production builds)
 *
 * The loaded app uses the MCP Apps SDK's useApp() hook which automatically
 * connects via PostMessageTransport to window.parent. The parent side uses
 * McpAppHost (wrapping AppBridge) to communicate.
 */
export function IframeResource({
  src,
  scriptSrc,
  hostContext,
  toolInput,
  toolInputPartial,
  toolResult,
  hostOptions,
  csp,
  permissions,
  prefersBorder,
  className,
  style,
  onDisplayModeReady,
  debugInjectState,
  injectOpenAIRuntime,
  sandboxUrl,
}: IframeResourceProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const hostRef = useRef<McpAppHost | null>(null);

  // Determine which URL to validate
  const resourceUrl = src ?? scriptSrc;

  // Refs for resource data so the stable onSandboxReady callback can access current values
  // Refs for values that the stable onSandboxReady callback needs to access.
  // Without refs, the callback would capture stale values from the initial render.
  const srcRef = useRef(src);
  srcRef.current = src;
  const scriptSrcRef = useRef(scriptSrc);
  scriptSrcRef.current = scriptSrc;
  const cspRef = useRef(csp);
  cspRef.current = csp;
  const hostContextRef = useRef(hostContext);
  hostContextRef.current = hostContext;
  const injectOpenAIRuntimeRef = useRef(injectOpenAIRuntime);
  injectOpenAIRuntimeRef.current = injectOpenAIRuntime;
  const permissionsRef = useRef(permissions);
  permissionsRef.current = permissions;

  // Track whether we've received an initial size report
  const hasReceivedSizeRef = useRef(false);

  // Track current display mode so the stable onSizeChanged callback can
  // skip auto-resizing in fullscreen (where the host container is fixed).
  const displayModeRef = useRef(hostContext?.displayMode);
  displayModeRef.current = hostContext?.displayMode;

  // Remember the last content-driven height so we can restore it when
  // leaving fullscreen (the app won't re-report until content changes).
  const lastContentHeightRef = useRef<number | null>(null);

  // Create the MCP Apps host
  const host = useMemo(
    () =>
      new McpAppHost({
        hostContext,
        ...hostOptions,
        onSizeChanged: (params) => {
          hostOptions?.onSizeChanged?.(params);
          if (params.height != null) {
            lastContentHeightRef.current = params.height;
          }
          // Skip auto-resizing in fullscreen mode where the host provides a
          // fixed container — auto-sizing would create a feedback loop with
          // viewport-relative units like dvh. PIP and inline use content-driven sizing.
          if (displayModeRef.current === 'fullscreen') return;
          const iframe = iframeRef.current;
          if (!iframe) return;

          // Border-box compensation: if the iframe has borders, add their
          // width/height so the content area matches the reported size.
          // Pattern from ext-apps basic-host reference implementation.
          const style = getComputedStyle(iframe);
          const isBorderBox = style.boxSizing === 'border-box';

          const from: Record<string, string> = {};
          const to: Record<string, string> = {};

          if (params.width != null) {
            let w = params.width;
            if (isBorderBox) {
              w += parseFloat(style.borderLeftWidth) + parseFloat(style.borderRightWidth);
            }
            // Use min-width with min() to allow responsive growing while
            // respecting the content's minimum width.
            from.minWidth = `${iframe.offsetWidth}px`;
            iframe.style.minWidth = `min(${w}px, 100%)`;
            to.minWidth = `min(${w}px, 100%)`;
          }
          if (params.height != null) {
            hasReceivedSizeRef.current = true;
            let h = params.height;
            if (isBorderBox) {
              h += parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
            }
            from.height = `${iframe.offsetHeight}px`;
            iframe.style.height = `${h}px`;
            to.height = `${h}px`;
          }

          // Smooth animated transition for size changes.
          if (Object.keys(from).length > 0) {
            iframe.animate([from, to], { duration: 300, easing: 'ease-out' });
          }
        },
        onDisplayModeReady: (mode) => onDisplayModeReady?.(mode),
        onSandboxReady: () => {
          // The sandbox proxy is ready. Deliver the app content.
          const currentSrc = srcRef.current;
          const currentScriptSrc = scriptSrcRef.current;
          const currentHost = hostRef.current;
          if (!currentHost) return;

          if (currentScriptSrc) {
            // scriptSrc mode (prod): use the official sandbox-resource-ready protocol.
            // Generate the full app HTML and send it to the proxy.
            const absoluteScriptSrc = currentScriptSrc.startsWith('/')
              ? `${window.location.origin}${currentScriptSrc}`
              : currentScriptSrc;
            const cspPolicy = generateCSP(cspRef.current, absoluteScriptSrc);
            const theme = hostContextRef.current?.theme ?? 'dark';
            const platformScriptStr = injectOpenAIRuntimeRef.current
              ? MOCK_OPENAI_RUNTIME_SCRIPT
              : undefined;
            const appHtml = generateScriptHtml(
              absoluteScriptSrc,
              theme,
              cspPolicy,
              platformScriptStr
            );

            currentHost.sendSandboxResourceReady({
              html: appHtml,
              sandbox:
                'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox',
            });

            // Fade in the outer iframe
            if (iframeRef.current) {
              iframeRef.current.style.opacity = '1';
              iframeRef.current.style.transition = 'opacity 100ms';
            }
          } else if (currentSrc) {
            // src mode (dev): send the URL to the proxy for inner iframe src loading.
            // This is a simulator-specific extension — the proxy creates an inner iframe
            // with src pointing to the Vite dev server, preserving HMR.
            //
            // When using a separate-origin sandbox server, the src must be absolute
            // (relative paths would resolve against the sandbox origin, not the Vite server).
            const absoluteSrc = currentSrc.startsWith('/')
              ? `${window.location.origin}${currentSrc}`
              : currentSrc;
            const allowAttr = buildIframeAllow(permissionsRef.current);
            currentHost.sendRawMessage({
              jsonrpc: '2.0',
              method: 'sunpeak/sandbox-load-src',
              params: {
                src: absoluteSrc,
                allow: allowAttr,
                theme: hostContextRef.current?.theme,
                styleVars: hostContextRef.current?.styles?.variables,
              },
            });
          }
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [] // Stable - create once
  );
  hostRef.current = host;

  // Connect bridge transport as soon as the iframe element exists in the DOM,
  // before the browser loads the iframe content. For built HTML files with
  // inline scripts (same-origin), React effects inside the iframe can fire
  // before the parent's onLoad event, causing the app's `initialize` request
  // to be lost if the bridge transport isn't listening yet.
  const setIframeRef = useCallback(
    (node: HTMLIFrameElement | null) => {
      iframeRef.current = node;
      if (node?.contentWindow) {
        host.connectToIframe(node.contentWindow);
      }
    },
    [host]
  );

  // The outer iframe loads the sandbox proxy HTML. Show it immediately since
  // it's just the proxy shell. The proxy handles inner iframe creation and content.
  const handleLoad = useCallback(() => {
    if (iframeRef.current) {
      iframeRef.current.style.opacity = '1';
      iframeRef.current.style.transition = 'opacity 100ms';
    }
  }, []);

  // Sync mutable host options (e.g. onCallTool) into the existing host
  // instance when they change, without recreating the connection.
  useEffect(() => {
    if (hostOptions) {
      host.updateOptions(hostOptions);
    }
  }, [host, hostOptions]);

  // Update host context when props change.
  // McpAppHost.setHostContext() internally detects display mode changes
  // and waits for the iframe to commit its DOM before firing onDisplayModeReady.
  useEffect(() => {
    if (hostContext) {
      host.setHostContext(hostContext);
    }
    // In fullscreen the host provides a fixed container, so the iframe
    // should fill it. When leaving fullscreen, restore the last content-driven
    // height so the iframe isn't stuck at 100% or collapsed.
    if (iframeRef.current) {
      if (hostContext?.displayMode === 'fullscreen') {
        iframeRef.current.style.height = '100%';
      } else if (lastContentHeightRef.current != null) {
        iframeRef.current.style.height = `${lastContentHeightRef.current}px`;
      }
    }
  }, [host, hostContext]);

  // Send tool input updates
  // Note: Don't check host.initialized here - McpAppHost handles queueing internally
  useEffect(() => {
    if (toolInput) {
      host.sendToolInput(toolInput);
    }
  }, [host, toolInput]);

  // Send partial/streaming tool input
  useEffect(() => {
    if (toolInputPartial) {
      host.sendToolInputPartial(toolInputPartial);
    }
  }, [host, toolInputPartial]);

  // Send tool result updates
  // Note: Don't check host.initialized here - McpAppHost handles queueing internally
  useEffect(() => {
    if (toolResult) {
      host.sendToolResult(toolResult);
    }
  }, [host, toolResult]);

  // Debug: Inject state directly into app's useAppState hook
  useEffect(() => {
    if (debugInjectState != null) {
      host.injectState(debugInjectState);
    }
  }, [host, debugInjectState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      hostRef.current?.close();
    };
  }, []);

  // Validate URL
  const isValidUrl = useMemo(() => resourceUrl && isAllowedUrl(resourceUrl), [resourceUrl]);

  // Build iframe allow attribute from resource permissions
  const allowAttribute = useMemo(() => buildIframeAllow(permissions), [permissions]);

  // Border style when resource declares prefersBorder
  const borderStyle: React.CSSProperties = prefersBorder
    ? { border: '1px solid var(--color-border-primary, #e5e7eb)' }
    : { border: 'none' };

  // Build sandbox proxy content. When a separate-origin sandbox server is available,
  // use its URL for real cross-origin isolation (matching production hosts).
  // Otherwise fall back to srcdoc with the proxy HTML (for unit tests, embedded use).
  // Build sandbox proxy URL/HTML. These must NOT depend on theme — changing
  // theme should not reload the iframe (which would destroy app state and
  // show a loading flash). Theme is propagated to the app via hostContext
  // through PostMessage, not via iframe src/srcdoc.
  const sandboxSrc = useMemo(() => {
    if (!sandboxUrl) return undefined;
    const url = new URL('/proxy', sandboxUrl);
    if (injectOpenAIRuntime) url.searchParams.set('platform', 'chatgpt');
    return url.toString();
  }, [sandboxUrl, injectOpenAIRuntime]);

  const proxyHtml = useMemo(() => {
    if (sandboxSrc) return undefined;
    const platformScript = injectOpenAIRuntime ? MOCK_OPENAI_RUNTIME_SCRIPT : undefined;
    return generateSandboxProxyHtml(platformScript);
  }, [sandboxSrc, injectOpenAIRuntime]);

  const iframeStyle: React.CSSProperties = {
    ...borderStyle,
    background: 'transparent',
    colorScheme: hostContext?.theme === 'light' ? 'light dark' : 'dark light',
    // Start hidden; handleLoad fades in via direct DOM update
    opacity: 0,
    width: '100%',
    // In fullscreen, fill the container immediately. In other modes, use
    // minHeight to prevent collapse while waiting for the app to report size.
    ...(hostContext?.displayMode === 'fullscreen' ? { height: '100%' } : { minHeight: '200px' }),
    ...style,
  };

  // Apply containerDimensions constraints as a host-side wrapper so the app
  // reports its natural size via sizechange (no feedback loop) while the
  // simulator visually enforces the configured dimensions.
  //
  // height / maxHeight → clip the iframe vertically with overflow:hidden.
  //   Using a wrapper (not SafeArea inside the app) is intentional: if the
  //   app were to apply the height constraint internally, sizechange would
  //   echo the constrained value back and the host would lock in that size.
  // width / maxWidth → constrain the wrapper's width; the iframe fills 100%.
  //
  // The wrapper div is always rendered (never conditional) so that adding or
  // removing constraints is a style update, not a tree change. Conditionally
  // toggling the wrapper would unmount/remount the iframe mid-handshake,
  // which causes the tool result to never reach the app.
  const dims = hostContext?.containerDimensions;
  const isFullscreenMode = hostContext?.displayMode === 'fullscreen';
  const wrapperStyle: React.CSSProperties = {};
  if (dims && !isFullscreenMode) {
    const h = 'height' in dims ? dims.height : undefined;
    const mh = 'maxHeight' in dims ? dims.maxHeight : undefined;
    const w = 'width' in dims ? dims.width : undefined;
    const mw = 'maxWidth' in dims ? dims.maxWidth : undefined;
    if (h != null) {
      wrapperStyle.height = h;
      wrapperStyle.overflow = 'hidden';
    }
    if (mh != null) {
      wrapperStyle.maxHeight = mh;
      wrapperStyle.overflow = 'hidden';
    }
    if (w != null) wrapperStyle.width = w;
    if (mw != null) wrapperStyle.maxWidth = mw;
  }

  // Validate URL for src mode
  if (src && !isValidUrl) {
    console.error('[IframeResource] URL not allowed:', src);
    return <div style={{ color: 'red', padding: 20 }}>Error: URL not allowed: {src}</div>;
  }
  if (scriptSrc && !isValidUrl) {
    console.error('[IframeResource] Script source not allowed:', scriptSrc);
    return <div style={{ color: 'red', padding: 20 }}>Error: Script source not allowed.</div>;
  }

  // Both src and scriptSrc modes use the sandbox proxy. The proxy creates
  // the inner iframe after receiving content via onSandboxReady.
  return (
    <div className={className} style={wrapperStyle}>
      <iframe
        ref={setIframeRef}
        onLoad={handleLoad}
        style={iframeStyle}
        title="Resource Preview"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
        allow={allowAttribute}
        src={sandboxSrc ?? undefined}
        srcDoc={sandboxSrc ? undefined : proxyHtml}
      />
    </div>
  );
}

// Export security helpers for testing
export const _testExports = {
  escapeHtml,
  isAllowedUrl,
  isValidCspSource,
  generateCSP,
  generateScriptHtml,
  buildIframeAllow,
  ALLOWED_SCRIPT_ORIGINS,
};
