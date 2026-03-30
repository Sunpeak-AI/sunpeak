/**
 * Separate-origin sandbox server for the inspector's double-iframe architecture.
 *
 * Real hosts (ChatGPT, Claude) run the sandbox proxy iframe on a separate origin
 * (e.g., web-sandbox.oaiusercontent.com). This server replicates that by serving
 * the proxy HTML on a different localhost port, giving real origin isolation.
 *
 * This means:
 *   - window.top.location access from inside the iframe is blocked (cross-origin)
 *   - document.referrer is empty (cross-origin navigation)
 *   - The iframe sandbox attribute behaves identically to production
 *
 * The server is started by `sunpeak dev` and its URL is injected into the Inspector
 * via `__SUNPEAK_SANDBOX_URL__`.
 *
 * NOTE: The proxy HTML and mock openai script are duplicated from sandbox-proxy.ts
 * and mock-openai-runtime.ts because this file runs in Node.js at dev time and
 * cannot import TypeScript modules. Keep them in sync when making changes.
 */
import { createServer } from 'http';
import { getPort } from './get-port.mjs';

/**
 * Start the sandbox proxy server on a separate port.
 *
 * @param {Object} options
 * @param {number} [options.preferredPort=24680] - Port to try first
 * @returns {Promise<{ url: string, port: number, close: () => Promise<void> }>}
 */
export async function startSandboxServer({ preferredPort = 24680 } = {}) {
  const port = await getPort(preferredPort);

  const server = createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${port}`);

    if (url.pathname === '/proxy') {
      const theme = url.searchParams.get('theme') || 'dark';
      const platform = url.searchParams.get('platform') || '';
      const html = generateProxyHtml(theme, platform);

      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache',
        // No CORS headers needed — iframe src loads don't check CORS.
        // PostMessage works cross-origin by design.
      });
      res.end(html);
      return;
    }

    // Health check
    if (url.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('{"status":"ok"}');
      return;
    }

    res.writeHead(404);
    res.end('Not found');
  });

  server.on('clientError', (err, socket) => {
    if (err.code === 'ECONNRESET') {
      // Normal when browser tabs close abruptly
    } else if (
      err.code === 'HPE_INVALID_METHOD' &&
      err.rawPacket instanceof Buffer &&
      err.rawPacket[0] === 0x16
    ) {
      console.error(
        'Received HTTPS request on sandbox server (port ' + port + '). ' +
        'If you\'re using ngrok, make sure the upstream is http:// (not https://). ' +
        'Example: ngrok http 8000'
      );
    } else {
      console.error('Sandbox server client error', err);
    }
    socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
  });

  await new Promise((resolve, reject) => {
    server.listen(port, () => resolve());
    server.on('error', reject);
  });

  const sandboxUrl = `http://localhost:${port}`;

  return {
    url: sandboxUrl,
    port,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

/**
 * Generate the sandbox proxy HTML.
 *
 * This is the same proxy logic as sandbox-proxy.ts but as a plain string
 * (no TypeScript imports needed at dev server runtime). The proxy:
 *   1. Signals readiness via `ui/notifications/sandbox-proxy-ready`
 *   2. Listens for resource content or URL to load into the inner iframe
 *   3. Relays all PostMessage between parent and inner iframe
 *   4. Optionally injects platform runtime scripts (e.g., mock window.openai)
 */
function generateProxyHtml(theme, platform) {
  const colorScheme = theme === 'light' ? 'light' : 'dark';

  // Platform-specific runtime script (injected into the inner iframe)
  let platformScript = 'null';
  if (platform === 'chatgpt') {
    platformScript = JSON.stringify(MOCK_OPENAI_SCRIPT);
  }

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
  var platformScript = ${platformScript};

  // Relay messages between parent (host) and inner iframe (app)
  window.addEventListener('message', function(event) {
    var data = event.data;
    if (!data || typeof data !== 'object') return;

    if (event.source === window.parent) {
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
      // The inner iframe has a fence responder (injected by the Vite dev page
      // or embedded in the production HTML). If the ack arrives, relay it to
      // the host. If not (cross-origin injection failed), fall back to a
      // timeout-based ack after 150ms.
      if (data.method === 'sunpeak/fence' && data.params) {
        var fenceId = data.params.fenceId;
        var acked = false;

        // Listen for the inner iframe's fence-ack
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

        // Forward fence to inner iframe
        if (innerWindow) {
          try { innerWindow.postMessage(data, '*'); } catch(e) {}
        }

        // Fallback: if no ack within 150ms (fence responder not available),
        // ack from the proxy after allowing time for the inner iframe to
        // process the preceding hostContext change.
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
      // Messages from the app -> forward to host
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

    if (params.theme) {
      innerFrame.style.colorScheme = params.theme;
    }

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

      // Inject style variables
      if (params.styleVars) {
        try {
          var root = innerFrame.contentDocument.documentElement;
          for (var key in params.styleVars) {
            if (params.styleVars[key]) root.style.setProperty(key, params.styleVars[key]);
          }
        } catch(e) { /* cross-origin */ }
      }

      innerFrame.style.opacity = '1';
      innerFrame.style.transition = 'opacity 100ms';
    });

    innerFrame.style.opacity = '0';
    document.body.appendChild(innerFrame);
    innerWindow = innerFrame.contentWindow;
  }

  var PAINT_FENCE_SCRIPT = 'window.addEventListener("message",function(e){' +
    'if(e.data&&e.data.method==="sunpeak/fence"){' +
    'var fid=e.data.params&&e.data.params.fenceId;' +
    'requestAnimationFrame(function(){' +
    'e.source.postMessage({jsonrpc:"2.0",method:"sunpeak/fence-ack",params:{fenceId:fid}},"*");' +
    '});}});';

  // Signal readiness to the host. Retry every 200ms in case the host's
  // PostMessage listener isn't attached yet (srcdoc race with React refs).
  var readyInterval = setInterval(function() {
    window.parent.postMessage({
      jsonrpc: '2.0',
      method: 'ui/notifications/sandbox-proxy-ready',
      params: {}
    }, '*');
  }, 200);
  setTimeout(function() {
    window.parent.postMessage({
      jsonrpc: '2.0',
      method: 'ui/notifications/sandbox-proxy-ready',
      params: {}
    }, '*');
  }, 0);
  setTimeout(function() { clearInterval(readyInterval); }, 10000);
})();
</script>
</body>
</html>`;
}

/**
 * Mock OpenAI runtime script — same as mock-openai-runtime.ts MOCK_OPENAI_RUNTIME_SCRIPT.
 * Duplicated here to avoid TypeScript import in the Node.js dev server.
 */
const MOCK_OPENAI_SCRIPT = [
  'window.openai={',
  'uploadFile:function(f){console.log("[Inspector] uploadFile:",f.name);',
  'return Promise.resolve({fileId:"sim_file_"+Date.now()})},',
  'getFileDownloadUrl:function(p){console.log("[Inspector] getFileDownloadUrl:",p.fileId);',
  'return Promise.resolve({downloadUrl:"https://inspector.local/files/"+p.fileId})},',
  'requestModal:function(p){console.log("[Inspector] requestModal:",JSON.stringify(p));',
  'return Promise.resolve()},',
  'requestCheckout:function(s){console.log("[Inspector] requestCheckout:",JSON.stringify(s));',
  'return Promise.resolve({id:"sim_order_"+Date.now(),checkout_session_id:s.id||"sim_session",status:"completed"})},',
  'requestClose:function(){console.log("[Inspector] requestClose")},',
  'requestDisplayMode:function(p){console.log("[Inspector] requestDisplayMode:",p.mode);',
  'return Promise.resolve()},',
  'sendFollowUpMessage:function(p){console.log("[Inspector] sendFollowUpMessage:",p.prompt)},',
  'openExternal:function(p){console.log("[Inspector] openExternal:",p.href);window.open(p.href,"_blank")}',
  '};',
].join('');
