import * as React from 'react';
import { useEffect, useRef, useCallback, useMemo } from 'react';
import {
  useTheme,
  useDisplayMode,
  useLocale,
  useMaxHeight,
  useUserAgent,
  useSafeArea,
  useView,
  useToolInput,
  useWidgetProps,
  useToolResponseMetadata,
  useWidgetState,
} from '../hooks';

/**
 * Allowed origins for cross-origin script loading.
 * - Local development: localhost, 127.0.0.1, file://
 * - Production: sandbox.sunpeakai.com (serves user scripts)
 */
const ALLOWED_SCRIPT_ORIGINS = [
  'https://sandbox.sunpeakai.com',
  'http://localhost',
  'https://localhost',
  'http://127.0.0.1',
  'https://127.0.0.1',
];

/**
 * Allowed parent origins that can send messages to the iframe.
 * - Local development: localhost, 127.0.0.1
 * - Production: app.sunpeak.ai (hosts the simulator)
 */
const ALLOWED_PARENT_ORIGINS = [
  'https://app.sunpeak.ai',
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
 * Validates that a script source URL is from an allowed origin.
 * Allows same-origin scripts and scripts from whitelisted domains.
 */
function isAllowedScriptSrc(src: string): boolean {
  // Reject empty strings
  if (!src) {
    return false;
  }

  // Allow relative paths (same-origin) - must start with / but not //
  if (src.startsWith('/') && !src.startsWith('//')) {
    return true;
  }

  // Reject strings that don't look like URLs (no protocol)
  if (!src.includes('://')) {
    return false;
  }

  try {
    const url = new URL(src);

    // Allow same-origin
    if (url.origin === window.location.origin) {
      return true;
    }

    // Allow localhost with any port for development
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
      return true;
    }

    // Check against allowed origins (strict origin comparison only)
    return ALLOWED_SCRIPT_ORIGINS.some((allowed) => {
      try {
        const allowedUrl = new URL(allowed);
        return url.origin === allowedUrl.origin;
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  }
}

/**
 * Generates a Content Security Policy string from CSP configuration.
 * Creates a restrictive policy that only allows specified domains.
 */
function generateCSP(csp: WidgetCSP | undefined, scriptSrc: string): string {
  // Get script origin for CSP directives
  let scriptOrigin = '';
  try {
    const scriptUrl = new URL(scriptSrc, window.location.origin);
    scriptOrigin = scriptUrl.origin;
  } catch {
    // Invalid URL, skip
  }

  // Base policy: only allow same-origin by default
  const directives: string[] = [
    "default-src 'self'",
    // Allow inline scripts for the bridge, blob: for dynamic content, and the script origin
    `script-src 'self' 'unsafe-inline' blob: ${scriptOrigin}`.trim(),
    // Allow inline styles and data: URIs for images embedded in CSS
    `style-src 'self' 'unsafe-inline' ${scriptOrigin}`.trim(),
    // Disallow iframes within the iframe (no nesting)
    "frame-src 'none'",
    // Disallow form submissions
    "form-action 'none'",
    // Disallow changing the base URL
    "base-uri 'self'",
  ];

  // Build connect-src: allow the script origin + any specified connect domains
  const connectSources = new Set<string>(["'self'"]);
  if (scriptOrigin) {
    connectSources.add(scriptOrigin);
  }
  if (csp?.connect_domains) {
    for (const domain of csp.connect_domains) {
      connectSources.add(domain);
    }
  }
  directives.push(`connect-src ${Array.from(connectSources).join(' ')}`);

  // Build img-src, font-src from resource_domains
  const resourceSources = new Set<string>(["'self'", 'data:', 'blob:']);
  if (scriptOrigin) {
    resourceSources.add(scriptOrigin);
  }
  if (csp?.resource_domains) {
    for (const domain of csp.resource_domains) {
      resourceSources.add(domain);
    }
  }
  const resourceList = Array.from(resourceSources).join(' ');
  directives.push(`img-src ${resourceList}`);
  directives.push(`font-src ${resourceList}`);
  directives.push(`media-src ${resourceList}`);

  return directives.join('; ');
}

/**
 * Content Security Policy configuration for iframe resources.
 * Maps to the openai/widgetCSP field in resource JSON files.
 */
export interface WidgetCSP {
  /** Domains allowed for fetch/XHR/WebSocket connections */
  connect_domains?: string[];
  /** Domains allowed for scripts, images, styles, fonts */
  resource_domains?: string[];
}

interface IframeResourceProps {
  /** URL to a built .js file to load in the iframe. The HTML wrapper is generated automatically. */
  scriptSrc: string;
  /** Optional className for the iframe container */
  className?: string;
  /** Optional style for the iframe */
  style?: React.CSSProperties;
  /** Optional Content Security Policy configuration */
  csp?: WidgetCSP;
}

/**
 * Message types for parent-iframe communication.
 * These mirror the window.openai API structure.
 */
interface OpenAiMessage {
  type: 'openai:init' | 'openai:update';
  payload: {
    theme?: string | null;
    displayMode?: string | null;
    locale?: string | null;
    maxHeight?: number | null;
    userAgent?: unknown;
    safeArea?: unknown;
    view?: unknown;
    toolInput?: unknown;
    toolOutput?: unknown;
    toolResponseMetadata?: unknown;
    widgetState?: unknown;
  };
}

interface WidgetMessage {
  type:
    | 'openai:requestDisplayMode'
    | 'openai:callTool'
    | 'openai:sendFollowUpMessage'
    | 'openai:openExternal'
    | 'openai:requestModal'
    | 'openai:notifyIntrinsicHeight'
    | 'openai:setWidgetState';
  payload?: unknown;
}

/**
 * Generates the bridge script with allowed parent origins injected.
 * This bridges the MessageChannel API with the window.openai interface.
 * Uses MessageChannel for secure communication instead of postMessage('*').
 */
function generateBridgeScript(allowedParentOrigins: string[]): string {
  const originsJson = JSON.stringify(allowedParentOrigins);
  return `
<script>
(function() {
  // Allowed origins that can send messages to this iframe
  var allowedOrigins = ${originsJson};

  // MessagePort for secure communication with parent (set during handshake)
  var messagePort = null;

  // Queue messages until port is ready
  var messageQueue = [];

  // Check if an origin is allowed (handles localhost with any port)
  function isAllowedOrigin(origin) {
    // Note: We no longer accept 'null' origin - MessageChannel provides security
    for (var i = 0; i < allowedOrigins.length; i++) {
      if (origin === allowedOrigins[i]) return true;
      // Handle localhost/127.0.0.1 with any port
      if (allowedOrigins[i].indexOf('localhost') !== -1 || allowedOrigins[i].indexOf('127.0.0.1') !== -1) {
        try {
          var allowed = new URL(allowedOrigins[i]);
          var test = new URL(origin);
          if (test.hostname === allowed.hostname && test.protocol === allowed.protocol) return true;
        } catch (e) {}
      }
    }
    return false;
  }

  // Send message via MessagePort (queues if port not ready)
  function sendToParent(message) {
    if (messagePort) {
      messagePort.postMessage(message);
    } else {
      messageQueue.push(message);
    }
  }

  // Flush queued messages once port is ready
  function flushMessageQueue() {
    while (messageQueue.length > 0) {
      var msg = messageQueue.shift();
      messagePort.postMessage(msg);
    }
  }

  // Set up window.openai with placeholder values (updated via MessageChannel)
  window.openai = {
    theme: 'dark',
    locale: 'en-US',
    displayMode: 'inline',
    maxHeight: undefined,
    userAgent: { device: { type: 'desktop' }, capabilities: { hover: true, touch: false } },
    safeArea: { insets: { top: 0, bottom: 0, left: 0, right: 0 } },
    view: null,
    toolInput: {},
    toolOutput: null,
    toolResponseMetadata: null,
    widgetState: null,

    // API methods that send messages to parent via MessagePort
    callTool: function(name, args) {
      sendToParent({ type: 'openai:callTool', payload: { name, args } });
    },
    sendFollowUpMessage: function(params) {
      sendToParent({ type: 'openai:sendFollowUpMessage', payload: params });
    },
    openExternal: function(params) {
      sendToParent({ type: 'openai:openExternal', payload: params });
    },
    requestDisplayMode: function(params) {
      sendToParent({ type: 'openai:requestDisplayMode', payload: params });
    },
    requestModal: function(params) {
      sendToParent({ type: 'openai:requestModal', payload: params });
    },
    notifyIntrinsicHeight: function(height) {
      // Height updates use postMessage directly to avoid delays during handshake.
      // This is safe because height values are validated on the parent side.
      window.parent.postMessage({ type: 'openai:notifyIntrinsicHeight', payload: { height } }, '*');
    },
    setWidgetState: function(state) {
      sendToParent({ type: 'openai:setWidgetState', payload: state });
    },
  };

  // Handle incoming messages on the MessagePort
  function handlePortMessage(event) {
    var data = event.data;
    if (!data || typeof data !== 'object') return;

    if (data.type === 'openai:init' || data.type === 'openai:update') {
      var payload = data.payload || {};

      // Update window.openai with new values
      if (payload.theme !== undefined) {
        window.openai.theme = payload.theme;
        // Also set data-theme attribute for CSS theming
        document.documentElement.dataset.theme = payload.theme;
      }
      if (payload.displayMode !== undefined) window.openai.displayMode = payload.displayMode;
      if (payload.locale !== undefined) window.openai.locale = payload.locale;
      if (payload.maxHeight !== undefined) window.openai.maxHeight = payload.maxHeight;
      if (payload.userAgent !== undefined) window.openai.userAgent = payload.userAgent;
      if (payload.safeArea !== undefined) window.openai.safeArea = payload.safeArea;
      if (payload.view !== undefined) window.openai.view = payload.view;
      if (payload.toolInput !== undefined) window.openai.toolInput = payload.toolInput;
      if (payload.toolOutput !== undefined) window.openai.toolOutput = payload.toolOutput;
      if (payload.toolResponseMetadata !== undefined) window.openai.toolResponseMetadata = payload.toolResponseMetadata;
      if (payload.widgetState !== undefined) window.openai.widgetState = payload.widgetState;

      // Dispatch custom event so widgets can react to changes
      // Must match SET_GLOBALS_EVENT_TYPE ('openai:set_globals') in providers/openai/types.ts
      window.dispatchEvent(new CustomEvent('openai:set_globals', { detail: { globals: payload } }));
    }
  }

  // Listen for handshake message from parent (transfers MessagePort)
  window.addEventListener('message', function(event) {
    // Strict source validation: only accept messages from parent window
    if (event.source !== window.parent) {
      console.warn('[IframeBridge] Rejected message from non-parent source');
      return;
    }

    // Validate message origin (allows localhost with any port)
    if (!isAllowedOrigin(event.origin)) {
      console.warn('[IframeBridge] Rejected message from untrusted origin:', event.origin);
      return;
    }

    // Handle handshake with MessagePort transfer
    if (event.data && event.data.type === 'openai:handshake' && event.ports && event.ports.length > 0) {
      messagePort = event.ports[0];
      messagePort.onmessage = handlePortMessage;
      messagePort.start();

      // Flush any queued messages
      flushMessageQueue();

      // Confirm handshake complete
      sendToParent({ type: 'openai:handshake_complete' });
    }
  });

  // Signal to parent that we're ready for handshake
  window.parent.postMessage({ type: 'openai:ready' }, '*');

  // Auto-measure and report content height immediately
  var lastHeight = 0;
  var pendingFrame = null;
  function reportHeight() {
    var height = document.documentElement.scrollHeight || document.body.scrollHeight;
    if (height > 0 && height !== lastHeight) {
      lastHeight = height;
      window.openai.notifyIntrinsicHeight(height);
    }
  }

  // Schedule height report on next animation frame (batches rapid changes)
  function scheduleHeightReport() {
    if (pendingFrame) return;
    pendingFrame = requestAnimationFrame(function() {
      pendingFrame = null;
      reportHeight();
    });
  }

  // Report height immediately when ready
  if (document.readyState === 'complete') {
    reportHeight();
  } else {
    window.addEventListener('load', reportHeight);
  }

  // Use ResizeObserver to track size changes
  if (typeof ResizeObserver !== 'undefined') {
    var resizeObserver = new ResizeObserver(function() {
      scheduleHeightReport();
    });
    function observeElements() {
      if (document.body) resizeObserver.observe(document.body);
      if (document.documentElement) resizeObserver.observe(document.documentElement);
      // Also observe the root element if it exists
      var root = document.getElementById('root');
      if (root) resizeObserver.observe(root);
    }
    if (document.body) {
      observeElements();
    } else {
      document.addEventListener('DOMContentLoaded', observeElements);
    }
  }

  // Use MutationObserver to detect DOM changes that may affect height
  if (typeof MutationObserver !== 'undefined') {
    var mutationObserver = new MutationObserver(function() {
      scheduleHeightReport();
    });
    function observeMutations() {
      mutationObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true
      });
    }
    if (document.body) {
      observeMutations();
    } else {
      document.addEventListener('DOMContentLoaded', observeMutations);
    }
  }
})();
</script>
`;
}

/**
 * Generates HTML wrapper for a script URL.
 * Includes minimal styling for transparent background and full-size root.
 * The scriptSrc is escaped to prevent XSS via attribute injection.
 */
function generateScriptHtml(scriptSrc: string, theme: string, cspPolicy: string): string {
  const safeScriptSrc = escapeHtml(scriptSrc);
  const safeCsp = escapeHtml(cspPolicy);
  return `<!DOCTYPE html>
<html lang="en" data-theme="${theme}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy" content="${safeCsp}" />
  <title>Resource</title>
  <style>
    html, body, #root {
      margin: 0;
      padding: 0;
      height: 100%;
      width: 100%;
    }
    body {
      background: transparent;
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script src="${safeScriptSrc}"></script>
</body>
</html>`;
}

/**
 * Injects the bridge script into the HTML content.
 * The script is inserted right after the opening <head> tag.
 */
function injectBridgeScript(htmlContent: string, bridgeScript: string): string {
  // Try to inject after <head>
  const headMatch = htmlContent.match(/<head[^>]*>/i);
  if (headMatch) {
    const insertPos = headMatch.index! + headMatch[0].length;
    return htmlContent.slice(0, insertPos) + bridgeScript + htmlContent.slice(insertPos);
  }

  // Fallback: inject after <!DOCTYPE html> or at the beginning
  const doctypeMatch = htmlContent.match(/<!DOCTYPE[^>]*>/i);
  if (doctypeMatch) {
    const insertPos = doctypeMatch.index! + doctypeMatch[0].length;
    return htmlContent.slice(0, insertPos) + bridgeScript + htmlContent.slice(insertPos);
  }

  // Last resort: prepend
  return bridgeScript + htmlContent;
}

/**
 * IframeResource renders production .js files in an actual iframe.
 *
 * It sets up a postMessage bridge to communicate window.openai state
 * between the parent simulator and the iframe content.
 *
 * Usage:
 * ```tsx
 * <IframeResource scriptSrc="/dist/carousel.js" />
 * ```
 */
export function IframeResource({ scriptSrc, className, style, csp }: IframeResourceProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const messageChannelRef = useRef<MessageChannel | null>(null);
  const messagePortRef = useRef<MessagePort | null>(null);
  const [isHeightReady, setIsHeightReady] = React.useState(false);

  // Reset height ready state when script source changes
  // Also set a fallback timeout to show iframe if height reporting fails
  React.useEffect(() => {
    setIsHeightReady(false);
    // Fallback: show iframe after 500ms even if no height update received
    const timeout = setTimeout(() => {
      setIsHeightReady(true);
    }, 500);
    return () => clearTimeout(timeout);
  }, [scriptSrc]);

  // Read all globals from the simulator's window.openai
  const theme = useTheme();
  const displayMode = useDisplayMode();
  const locale = useLocale();
  const maxHeight = useMaxHeight();
  const userAgent = useUserAgent();
  const safeArea = useSafeArea();
  const view = useView();
  const toolInput = useToolInput();
  const toolOutput = useWidgetProps();
  const toolResponseMetadata = useToolResponseMetadata();
  const [widgetState] = useWidgetState();

  // Build the current state payload
  const currentState = React.useMemo(
    () => ({
      theme,
      displayMode,
      locale,
      maxHeight,
      userAgent,
      safeArea,
      view,
      toolInput,
      toolOutput,
      toolResponseMetadata,
      widgetState,
    }),
    [
      theme,
      displayMode,
      locale,
      maxHeight,
      userAgent,
      safeArea,
      view,
      toolInput,
      toolOutput,
      toolResponseMetadata,
      widgetState,
    ]
  );

  // Send state updates to the iframe via MessagePort
  const sendUpdate = useCallback(
    (type: 'openai:init' | 'openai:update') => {
      const port = messagePortRef.current;
      if (port) {
        const message: OpenAiMessage = {
          type,
          payload: currentState,
        };
        port.postMessage(message);
      }
    },
    [currentState]
  );

  // Use ref to hold sendUpdate so MessagePort handler doesn't need to change
  const sendUpdateRef = useRef(sendUpdate);
  useEffect(() => {
    sendUpdateRef.current = sendUpdate;
  }, [sendUpdate]);

  // Handle messages from the iframe via MessagePort
  // This handler is stable (no dependencies) to avoid breaking MessageChannel on re-renders
  const handlePortMessage = useCallback(
    (event: MessageEvent<WidgetMessage | { type: string }>) => {
      // Validate message structure
      if (!event.data || typeof event.data !== 'object' || typeof event.data.type !== 'string') {
        return;
      }

      const { type } = event.data;

      switch (type) {
        case 'openai:handshake_complete':
          // Handshake complete, send initial state
          sendUpdateRef.current('openai:init');
          break;

        case 'openai:requestDisplayMode': {
          const payload = (event.data as WidgetMessage).payload;
          // Validate payload structure
          if (
            !payload ||
            typeof payload !== 'object' ||
            !('mode' in payload) ||
            typeof (payload as { mode: unknown }).mode !== 'string'
          ) {
            console.warn('[IframeResource] Invalid requestDisplayMode payload');
            return;
          }
          const validModes = ['inline', 'pip', 'fullscreen'];
          const mode = (payload as { mode: string }).mode;
          if (!validModes.includes(mode)) {
            console.warn('[IframeResource] Invalid display mode:', mode);
            return;
          }
          // Forward to the mock's requestDisplayMode
          if (
            typeof window !== 'undefined' &&
            (
              window as unknown as {
                openai?: { requestDisplayMode?: (params: { mode: string }) => void };
              }
            ).openai?.requestDisplayMode
          ) {
            (
              window as unknown as {
                openai: { requestDisplayMode: (params: { mode: string }) => void };
              }
            ).openai.requestDisplayMode({ mode });
          }
          break;
        }

        case 'openai:setWidgetState': {
          const payload = (event.data as WidgetMessage).payload;
          // Validate payload is null or an object (not arrays, functions, etc.)
          if (payload !== null && (typeof payload !== 'object' || Array.isArray(payload))) {
            console.warn('[IframeResource] Invalid widgetState payload');
            return;
          }
          // Forward to the mock's setWidgetState
          if (
            typeof window !== 'undefined' &&
            (window as unknown as { openai?: { setWidgetState?: (state: unknown) => void } }).openai
              ?.setWidgetState
          ) {
            (
              window as unknown as { openai: { setWidgetState: (state: unknown) => void } }
            ).openai.setWidgetState(payload);
          }
          break;
        }

        case 'openai:notifyIntrinsicHeight': {
          const payload = (event.data as WidgetMessage).payload;
          // Validate payload structure and height is a reasonable number
          if (
            !payload ||
            typeof payload !== 'object' ||
            !('height' in payload) ||
            typeof (payload as { height: unknown }).height !== 'number'
          ) {
            console.warn('[IframeResource] Invalid notifyIntrinsicHeight payload');
            return;
          }
          const height = (payload as { height: number }).height;
          // Sanity check: height should be positive and not absurdly large
          if (height <= 0 || height > 100000) {
            console.warn('[IframeResource] Height out of range:', height);
            return;
          }
          if (iframeRef.current) {
            iframeRef.current.style.height = `${height}px`;
          }
          break;
        }

        case 'openai:callTool':
        case 'openai:sendFollowUpMessage':
        case 'openai:openExternal':
        case 'openai:requestModal':
          // These could be forwarded to the mock API as needed
          console.log(`[IframeResource] Received ${type}:`, (event.data as WidgetMessage).payload);
          break;
      }
    },
    [] // No dependencies - uses refs for changing values
  );

  // Handle initial postMessage from iframe requesting handshake
  // Also handles height updates via postMessage (for immediate responsiveness)
  useEffect(() => {
    const handleMessage = (event: MessageEvent<{ type: string; payload?: unknown }>) => {
      // Only handle messages from our iframe
      if (iframeRef.current && event.source !== iframeRef.current.contentWindow) {
        return;
      }

      // Validate message structure
      if (!event.data || typeof event.data !== 'object' || typeof event.data.type !== 'string') {
        return;
      }

      if (event.data.type === 'openai:ready') {
        // Create MessageChannel for secure communication
        const channel = new MessageChannel();
        messageChannelRef.current = channel;
        messagePortRef.current = channel.port1;

        // Set up message handler on our port
        channel.port1.onmessage = handlePortMessage;
        channel.port1.start();

        // Transfer port2 to the iframe
        const iframe = iframeRef.current;
        if (iframe?.contentWindow) {
          iframe.contentWindow.postMessage({ type: 'openai:handshake' }, '*', [channel.port2]);
        }
      }

      // Handle height updates via postMessage (for immediate responsiveness before handshake)
      if (event.data.type === 'openai:notifyIntrinsicHeight') {
        const payload = event.data.payload;
        if (
          !payload ||
          typeof payload !== 'object' ||
          !('height' in payload) ||
          typeof (payload as { height: unknown }).height !== 'number'
        ) {
          return;
        }
        const height = (payload as { height: number }).height;
        // Sanity check: height should be positive and not absurdly large
        if (height <= 0 || height > 100000) {
          return;
        }
        if (iframeRef.current) {
          iframeRef.current.style.height = `${height}px`;
          // Show iframe once we have proper height (prevents flash of incorrect size)
          setIsHeightReady(true);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
      // Clean up MessageChannel
      if (messagePortRef.current) {
        messagePortRef.current.close();
      }
    };
  }, [handlePortMessage]);

  // Send updates when state changes
  useEffect(() => {
    sendUpdate('openai:update');
  }, [sendUpdate]);

  // Validate script source is from an allowed origin
  const isValidScriptSrc = useMemo(() => isAllowedScriptSrc(scriptSrc), [scriptSrc]);

  // Generate HTML and create blob URL (keeps DOM clean in devtools)
  const blobUrl = useMemo(() => {
    if (!isValidScriptSrc) {
      console.error('[IframeResource] Script source not allowed:', scriptSrc);
      // Return a safe error page
      const errorHtml = `<!DOCTYPE html><html><body><h1>Error</h1><p>Script source not allowed.</p></body></html>`;
      const blob = new Blob([errorHtml], { type: 'text/html' });
      return URL.createObjectURL(blob);
    }

    // Convert relative paths to absolute (blob URLs can't resolve relative paths)
    const absoluteScriptSrc = scriptSrc.startsWith('/')
      ? `${window.location.origin}${scriptSrc}`
      : scriptSrc;

    // Generate CSP policy
    const cspPolicy = generateCSP(csp, absoluteScriptSrc);

    // Generate bridge script with allowed parent origins
    const bridgeScript = generateBridgeScript(ALLOWED_PARENT_ORIGINS);
    const html = injectBridgeScript(
      generateScriptHtml(absoluteScriptSrc, theme ?? 'dark', cspPolicy),
      bridgeScript
    );
    const blob = new Blob([html], { type: 'text/html' });
    return URL.createObjectURL(blob);
  }, [scriptSrc, theme, isValidScriptSrc, csp]);

  // Clean up blob URL on unmount or when it changes
  useEffect(() => {
    return () => URL.revokeObjectURL(blobUrl);
  }, [blobUrl]);

  return (
    <iframe
      ref={iframeRef}
      src={blobUrl}
      className={className}
      style={{
        border: 'none',
        width: '100%',
        height: '100%',
        // Hide until first height update to prevent flash of incorrect size
        opacity: isHeightReady ? 1 : 0,
        transition: 'opacity 0.1s ease-in',
        ...style,
      }}
      title="Resource Preview"
      sandbox="allow-scripts"
      // Permissions policy: deny access to sensitive device APIs
      allow="accelerometer 'none'; autoplay 'none'; camera 'none'; display-capture 'none'; geolocation 'none'; gyroscope 'none'; magnetometer 'none'; microphone 'none'; midi 'none'; payment 'none'; publickey-credentials-get 'none'; usb 'none'; xr-spatial-tracking 'none'"
    />
  );
}

// Export security helpers for testing
export const _testExports = {
  escapeHtml,
  isAllowedScriptSrc,
  generateBridgeScript,
  generateCSP,
  generateScriptHtml,
  ALLOWED_SCRIPT_ORIGINS,
  ALLOWED_PARENT_ORIGINS,
};
