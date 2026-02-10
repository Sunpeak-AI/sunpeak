import * as React from 'react';
import { useEffect, useRef, useMemo, useCallback } from 'react';
import { McpAppHost, type McpAppHostOptions } from './mcp-app-host';
import type { McpUiHostContext } from '@modelcontextprotocol/ext-apps';
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
 */
export interface ResourceCSP {
  /** Domains allowed for fetch/XHR/WebSocket connections */
  connectDomains?: string[];
  /** Domains allowed for scripts, images, styles, fonts */
  resourceDomains?: string[];
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
 * Domains required by the sunpeak SDK and its peer dependencies
 * (e.g., @openai/apps-sdk-ui loads fonts/styles from cdn.openai.com).
 */
const SDK_RESOURCE_DOMAINS = ['https://cdn.openai.com'];

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

  const directives: string[] = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: ${scriptOrigin}`.trim(),
    `style-src 'self' 'unsafe-inline' ${scriptOrigin}`.trim(),
    "frame-src 'none'",
    "form-action 'none'",
    "base-uri 'self'",
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
  for (const domain of SDK_RESOURCE_DOMAINS) resourceSources.add(domain);
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
 * Allows the host to wait for this iframe to process pending messages and
 * commit DOM updates before revealing content during display mode transitions.
 *
 * Used in two places:
 * - Embedded in the generated HTML for scriptSrc mode
 * - Injected into src-mode iframes after load via contentDocument
 */
const PAINT_FENCE_SCRIPT = `window.addEventListener("message",function(e){
if(e.data&&e.data.method==="sunpeak/fence"){
var fid=e.data.params&&e.data.params.fenceId;
requestAnimationFrame(function(){
e.source.postMessage({jsonrpc:"2.0",method:"sunpeak/fence-ack",params:{fenceId:fid}},"*");
});}});`;

/**
 * Inject the paint fence responder into an iframe's document.
 * For src-mode iframes the host doesn't control the HTML, so we inject the
 * script after load. This requires same-origin access (sandbox must include
 * allow-same-origin). Silently skipped for cross-origin iframes.
 */
function injectPaintFence(iframe: HTMLIFrameElement): void {
  try {
    const doc = iframe.contentDocument;
    if (!doc || doc.querySelector('script[data-sunpeak-fence]')) return;
    const script = doc.createElement('script');
    script.setAttribute('data-sunpeak-fence', '');
    script.textContent = PAINT_FENCE_SCRIPT;
    doc.head.appendChild(script);
  } catch {
    // Cross-origin iframe — contentDocument access blocked
  }
}

/**
 * Generates HTML wrapper for a script URL.
 * The MCP Apps SDK in the loaded script handles communication via PostMessageTransport.
 */
function generateScriptHtml(scriptSrc: string, theme: string, cspPolicy: string): string {
  const safeScriptSrc = escapeHtml(scriptSrc);
  const safeCsp = escapeHtml(cspPolicy);
  const safeTheme = escapeHtml(theme);
  return `<!DOCTYPE html>
<html lang="en" data-theme="${safeTheme}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy" content="${safeCsp}" />
  <title>Resource</title>
  <style>
    html, body, #root {
      margin: 0;
      padding: 0;
      width: 100%;
      /* Use min-height instead of height so body sizes to content.
         This allows ResizeObserver to detect content changes and
         report accurate intrinsic height to the host. */
      min-height: 100%;
      background: transparent;
      color-scheme: dark light;
    }
  </style>
  <script>${PAINT_FENCE_SCRIPT}</script>
</head>
<body>
  <div id="root"></div>
  <script src="${safeScriptSrc}"></script>
</body>
</html>`;
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
  /** Tool result to send after connection */
  toolResult?: CallToolResult;
  /** Optional callbacks for the MCP Apps host */
  hostOptions?: McpAppHostOptions;
  /** Optional CSP configuration (only used with scriptSrc) */
  csp?: ResourceCSP;
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
  toolResult,
  hostOptions,
  csp,
  className,
  style,
  onDisplayModeReady,
  debugInjectState,
}: IframeResourceProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const hostRef = useRef<McpAppHost | null>(null);

  // Determine which URL to validate
  const resourceUrl = src ?? scriptSrc;

  // Track whether we've received an initial size report
  const hasReceivedSizeRef = useRef(false);

  // Create the MCP Apps host
  const host = useMemo(
    () =>
      new McpAppHost({
        hostContext,
        ...hostOptions,
        onSizeChanged: (params) => {
          hostOptions?.onSizeChanged?.(params);
          if (iframeRef.current && params.height != null) {
            hasReceivedSizeRef.current = true;
            iframeRef.current.style.height = `${params.height}px`;
          }
        },
        onDisplayModeReady: (mode) => onDisplayModeReady?.(mode),
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

  // After iframe content loads, inject the paint fence responder for src-mode
  // iframes (scriptSrc mode already embeds it in the generated HTML).
  // Tool data is NOT sent here — McpAppHost queues pending data and flushes
  // it automatically when the app initializes.
  const handleLoad = useCallback(() => {
    if (src && iframeRef.current) {
      injectPaintFence(iframeRef.current);
    }
  }, [src]);

  // Update host context when props change.
  // McpAppHost.setHostContext() internally detects display mode changes
  // and waits for the iframe to commit its DOM before firing onDisplayModeReady.
  useEffect(() => {
    if (hostContext) {
      host.setHostContext(hostContext);
    }
  }, [host, hostContext]);

  // Send tool input updates
  // Note: Don't check host.initialized here - McpAppHost handles queueing internally
  useEffect(() => {
    if (toolInput) {
      host.sendToolInput(toolInput);
    }
  }, [host, toolInput]);

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

  // For scriptSrc mode, generate HTML with srcdoc (must be above early return to satisfy rules-of-hooks)
  const htmlContent = useMemo(() => {
    if (!scriptSrc || !isValidUrl) {
      if (scriptSrc) {
        console.error('[IframeResource] Script source not allowed:', scriptSrc);
      }
      return `<!DOCTYPE html><html><body><h1>Error</h1><p>Script source not allowed.</p></body></html>`;
    }

    // Convert relative paths to absolute (srcdoc iframes can't resolve relative paths)
    const absoluteScriptSrc = scriptSrc.startsWith('/')
      ? `${window.location.origin}${scriptSrc}`
      : scriptSrc;

    const cspPolicy = generateCSP(csp, absoluteScriptSrc);
    const theme = hostContext?.theme ?? 'dark';
    return generateScriptHtml(absoluteScriptSrc, theme, cspPolicy);
  }, [scriptSrc, isValidUrl, csp, hostContext?.theme]);

  // For src mode, use iframe src directly
  if (src) {
    if (!isValidUrl) {
      console.error('[IframeResource] URL not allowed:', src);
      return <div style={{ color: 'red', padding: 20 }}>Error: URL not allowed: {src}</div>;
    }

    return (
      <iframe
        ref={setIframeRef}
        src={src}
        onLoad={handleLoad}
        className={className}
        style={{
          border: 'none',
          background: 'transparent',
          colorScheme: hostContext?.theme === 'light' ? 'light dark' : 'dark light',
          width: '100%',
          // Start with minHeight to prevent collapse, but allow auto-resize to set actual height.
          // Don't use height: 100% as it requires explicit height in parent chain.
          minHeight: '200px',
          ...style,
        }}
        title="Resource Preview"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
        allow="local-network-access *; microphone *; midi *; accelerometer 'none'; autoplay 'none'; camera 'none'; display-capture 'none'; geolocation 'none'; gyroscope 'none'; magnetometer 'none'; payment 'none'; publickey-credentials-get 'none'; usb 'none'; xr-spatial-tracking 'none'"
      />
    );
  }

  return (
    <iframe
      ref={setIframeRef}
      srcDoc={htmlContent}
      onLoad={handleLoad}
      className={className}
      style={{
        border: 'none',
        background: 'transparent',
        colorScheme: hostContext?.theme === 'light' ? 'light dark' : 'dark light',
        width: '100%',
        // Start with minHeight to prevent collapse, but allow auto-resize to set actual height.
        // Don't use height: 100% as it requires explicit height in parent chain.
        minHeight: '200px',
        ...style,
      }}
      title="Resource Preview"
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
      allow="local-network-access *; microphone *; midi *; accelerometer 'none'; autoplay 'none'; camera 'none'; display-capture 'none'; geolocation 'none'; gyroscope 'none'; magnetometer 'none'; payment 'none'; publickey-credentials-get 'none'; usb 'none'; xr-spatial-tracking 'none'"
    />
  );
}

// Export security helpers for testing
export const _testExports = {
  escapeHtml,
  isAllowedUrl,
  isValidCspSource,
  generateCSP,
  generateScriptHtml,
  ALLOWED_SCRIPT_ORIGINS,
};
