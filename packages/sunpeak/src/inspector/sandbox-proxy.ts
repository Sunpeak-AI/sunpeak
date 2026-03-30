/**
 * Sandbox proxy for the double-iframe architecture.
 *
 * Real hosts (ChatGPT, Claude) use a two-level iframe structure:
 *   1. Outer iframe (sandbox proxy) — acts as a message relay on a separate origin
 *   2. Inner iframe — loads the untrusted app HTML
 *
 * The proxy relays PostMessage between the host (parent) and the app (inner iframe),
 * providing origin isolation and security boundaries.
 *
 * The inspector replicates this architecture so apps are tested under the same
 * iframe nesting they'll encounter in production.
 *
 * Protocol:
 *   1. Host creates outer iframe with proxy HTML (srcdoc)
 *   2. Proxy sends `ui/notifications/sandbox-proxy-ready` to parent
 *   3. Host sends `ui/notifications/sandbox-resource-ready` with { html, sandbox, csp, permissions }
 *      OR `sunpeak/sandbox-load-src` with { src } for dev mode
 *   4. Proxy creates inner iframe and loads the content
 *   5. All subsequent messages relay transparently between parent and inner iframe
 */

/**
 * Generate the sandbox proxy HTML.
 *
 * This HTML is loaded into the outer iframe via srcdoc. It:
 *   - Signals readiness via `ui/notifications/sandbox-proxy-ready`
 *   - Listens for resource content or URL to load into the inner iframe
 *   - Relays all PostMessage between parent and inner iframe
 *   - Optionally injects platform runtime scripts (e.g., mock window.openai)
 *
 * @param platformScript - Optional JS to inject into the inner iframe before the app loads
 */
export function generateSandboxProxyHtml(platformScript?: string): string {
  const escapedPlatformScript = platformScript ? JSON.stringify(platformScript) : 'null';
  // Default to dark — theme is propagated to the app via hostContext PostMessage,
  // not via the proxy HTML. Using dark avoids white flash on load.
  const colorScheme = 'dark';

  return `<!DOCTYPE html>
<html style="color-scheme:${colorScheme}">
<head>
<meta name="color-scheme" content="${colorScheme}" />
<style>
html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: transparent; }
iframe { border: none; width: 100%; height: 100%; display: block; }
</style>
</head>
<body>
<script>
(function() {
  var innerFrame = null;
  var innerWindow = null;
  var platformScript = ${escapedPlatformScript};

  // Relay messages between parent (host) and inner iframe (app)
  window.addEventListener('message', function(event) {
    var data = event.data;
    if (!data || typeof data !== 'object') return;

    if (event.source === window.parent) {
      // ── Messages from the host ──

      // sandbox-resource-ready: load HTML into inner iframe (scriptSrc/prod mode)
      if (data.method === 'ui/notifications/sandbox-resource-ready' && data.params) {
        createInnerFrame(data.params);
        return;
      }

      // sunpeak/sandbox-load-src: load URL into inner iframe (src/dev mode)
      if (data.method === 'sunpeak/sandbox-load-src' && data.params) {
        createInnerFrameWithSrc(data.params);
        return;
      }

      // Handle paint fence. Forward to the inner iframe and wait for its ack.
      // If the inner iframe has a fence responder (same-origin, script injected),
      // the ack is deterministic. Otherwise fall back to a 150ms timeout.
      if (data.method === 'sunpeak/fence' && data.params) {
        var fenceId = data.params.fenceId;
        var acked = false;
        var onAck = function(e) {
          if (e.source !== innerWindow) return;
          if (e.data && e.data.method === 'sunpeak/fence-ack' &&
              e.data.params && e.data.params.fenceId === fenceId) {
            acked = true;
            window.removeEventListener('message', onAck);
            window.parent.postMessage(e.data, '*');
          }
        };
        window.addEventListener('message', onAck);
        if (innerWindow) {
          try { innerWindow.postMessage(data, '*'); } catch(e) {}
        }
        setTimeout(function() {
          if (!acked) {
            window.removeEventListener('message', onAck);
            window.parent.postMessage({
              jsonrpc: '2.0',
              method: 'sunpeak/fence-ack',
              params: { fenceId: fenceId }
            }, '*');
          }
        }, 150);
        return;
      }

      // Sync color-scheme on the inner iframe element when theme changes.
      // This ensures prefers-color-scheme resolves correctly inside the app.
      // Important: do NOT set color-scheme on the proxy's own document —
      // changing it from the initial 'dark' causes Chrome to re-evaluate
      // the CSS Canvas as opaque white, blocking the host's conversation
      // background from showing through the transparent proxy.
      if (data.method === 'ui/notifications/host-context-changed' && data.params && data.params.theme) {
        if (innerFrame) innerFrame.style.colorScheme = data.params.theme;
      }

      // Forward all other messages to the inner iframe
      if (innerWindow) {
        try { innerWindow.postMessage(data, '*'); } catch(e) { /* detached */ }
      }
    } else if (innerWindow && event.source === innerWindow) {
      // ── Messages from the app → forward to host ──
      try { window.parent.postMessage(data, '*'); } catch(e) { /* detached */ }
    }
  });

  function createInnerFrame(params) {
    clearInterval(readyInterval);
    if (innerFrame) innerFrame.remove();

    innerFrame = document.createElement('iframe');
    innerFrame.sandbox = params.sandbox ||
      'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox';
    if (params.allow) innerFrame.allow = params.allow;
    document.body.appendChild(innerFrame);
    innerWindow = innerFrame.contentWindow;

    // Write HTML content into the inner iframe
    var doc = innerFrame.contentDocument;
    if (doc && params.html) {
      doc.open();
      doc.write(params.html);
      doc.close();
    }
  }

  function createInnerFrameWithSrc(params) {
    clearInterval(readyInterval);
    if (innerFrame) innerFrame.remove();

    innerFrame = document.createElement('iframe');
    innerFrame.sandbox =
      'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox';
    if (params.allow) innerFrame.allow = params.allow;
    innerFrame.src = params.src;
    innerFrame.style.height = '100%';

    // Set color-scheme on the inner iframe to match the host theme.
    // This ensures prefers-color-scheme resolves correctly inside.
    if (params.theme) {
      innerFrame.style.colorScheme = params.theme;
    }

    // After load, inject helpers into the inner iframe
    innerFrame.addEventListener('load', function() {
      innerWindow = innerFrame.contentWindow;

      // Inject platform runtime (e.g., mock window.openai for ChatGPT)
      if (platformScript && innerWindow) {
        try {
          var pScript = innerFrame.contentDocument.createElement('script');
          pScript.textContent = platformScript;
          innerFrame.contentDocument.head.appendChild(pScript);
        } catch(e) { /* cross-origin */ }
      }

      // Inject paint fence responder
      try {
        var fenceScript = innerFrame.contentDocument.createElement('script');
        fenceScript.setAttribute('data-sunpeak-fence', '');
        fenceScript.textContent = PAINT_FENCE_SCRIPT;
        innerFrame.contentDocument.head.appendChild(fenceScript);
      } catch(e) { /* cross-origin */ }

      // Inject background rule
      if (params.theme) {
        try {
          innerFrame.contentDocument.documentElement.style.colorScheme = params.theme;
          var bgStyle = innerFrame.contentDocument.createElement('style');
          bgStyle.setAttribute('data-sunpeak-bg', '');
          bgStyle.textContent = 'html { background-color: var(--color-background-primary, Canvas); }';
          innerFrame.contentDocument.head.appendChild(bgStyle);
        } catch(e) { /* cross-origin */ }
      }

      // Inject style variables for immediate rendering
      if (params.styleVars) {
        try {
          var root = innerFrame.contentDocument.documentElement;
          for (var key in params.styleVars) {
            if (params.styleVars[key]) root.style.setProperty(key, params.styleVars[key]);
          }
        } catch(e) { /* cross-origin */ }
      }

      // Signal that load is complete — fade in
      innerFrame.style.opacity = '1';
      innerFrame.style.transition = 'opacity 100ms';
    });

    // Start hidden for smooth fade-in
    innerFrame.style.opacity = '0';
    document.body.appendChild(innerFrame);
    innerWindow = innerFrame.contentWindow;
  }

  // Paint fence responder — same as in iframe-resource.ts
  var PAINT_FENCE_SCRIPT = 'window.addEventListener("message",function(e){' +
    'if(e.data&&e.data.method==="sunpeak/fence"){' +
    'var fid=e.data.params&&e.data.params.fenceId;' +
    'requestAnimationFrame(function(){' +
    'e.source.postMessage({jsonrpc:"2.0",method:"sunpeak/fence-ack",params:{fenceId:fid}},"*");' +
    '});}});';

  // Signal to the host that the proxy is ready.
  // The srcdoc is parsed synchronously by the browser, which can race with
  // React's ref callback that sets up the PostMessage listener. To handle
  // this, we send the ready notification repeatedly until the host
  // acknowledges it (by sending content to load). The interval is cleared
  // as soon as we receive any message from the host (createInnerFrame or
  // createInnerFrameWithSrc), or after 10 seconds as a safety limit.
  var readyInterval = setInterval(function() {
    window.parent.postMessage({
      jsonrpc: '2.0',
      method: 'ui/notifications/sandbox-proxy-ready',
      params: {}
    }, '*');
  }, 200);
  // Send the first one immediately (next tick)
  setTimeout(function() {
    window.parent.postMessage({
      jsonrpc: '2.0',
      method: 'ui/notifications/sandbox-proxy-ready',
      params: {}
    }, '*');
  }, 0);
  // Stop retrying after 10 seconds — if the host hasn't responded by then,
  // something else is wrong.
  setTimeout(function() { clearInterval(readyInterval); }, 10000);
})();
</script>
</body>
</html>`;
}

/**
 * The mock OpenAI runtime script body for injection into the inner iframe.
 * Re-exported from mock-openai-runtime so the proxy can inject it.
 */
export { MOCK_OPENAI_RUNTIME_SCRIPT } from './mock-openai-runtime';
