#!/usr/bin/env node
/**
 * Generate a self-contained static sandbox proxy HTML for embedders to host
 * on a different origin from their main React app. The Inspector's
 * `sandboxUrl` prop points at the file's URL.
 *
 * The proxy logic is the same as `src/inspector/sandbox-proxy.ts` and the
 * `bin/lib/sandbox-server.mjs` dynamic server — but the platform decision
 * (whether to inject the mock `window.openai` runtime) happens at runtime
 * by reading `?platform=chatgpt` from the iframe's own URL, so a single
 * static file serves all hosts.
 *
 * Output: `dist/sandbox-proxy.html`
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = resolve(__dirname, '..');
const OUT_PATH = resolve(PKG_ROOT, 'dist', 'sandbox-proxy.html');

// Kept in sync by hand with `src/inspector/mock-openai-runtime.ts`. We can't
// import the TS source from this Node script, but the runtime is short and
// rarely changes. `src/inspector/sandbox-static.test.ts` compares the shipped
// HTML against the live module to catch drift.
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
  'openExternal:function(p){console.log("[Inspector] openExternal:",p.href);try{var u=new URL(p.href);if(u.protocol!=="http:"&&u.protocol!=="https:"){console.warn("[Inspector] openExternal blocked non-http(s) URL:",p.href);return}window.open(p.href,"_blank","noopener,noreferrer")}catch(e){console.warn("[Inspector] openExternal blocked invalid URL:",p.href)}}',
  '};',
].join('');

const HTML = `<!DOCTYPE html>
<html style="color-scheme:dark">
<head>
<meta charset="UTF-8" />
<meta name="color-scheme" content="dark" />
<title>sunpeak sandbox proxy</title>
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

  // Read platform at runtime from the iframe's own URL. The Inspector sets
  // ?platform=chatgpt on the sandboxUrl when the ChatGPT host is selected so
  // the mock window.openai runtime is available inside the app.
  var params = new URLSearchParams(window.location.search);
  var platform = params.get('platform') || '';
  var platformScript = platform === 'chatgpt'
    ? ${JSON.stringify(MOCK_OPENAI_SCRIPT)}
    : null;

  window.addEventListener('message', function(event) {
    var data = event.data;
    if (!data || typeof data !== 'object') return;

    if (event.source === window.parent) {
      if (data.method === 'ui/notifications/sandbox-resource-ready' && data.params) {
        createInnerFrame(data.params);
        return;
      }
      if (data.method === 'sunpeak/sandbox-load-src' && data.params) {
        createInnerFrameWithSrc(data.params);
        return;
      }
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
          try { innerWindow.postMessage(data, '*'); } catch (e) {}
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
      if (data.method === 'ui/notifications/host-context-changed' && data.params && data.params.theme) {
        if (innerFrame) innerFrame.style.colorScheme = data.params.theme;
      }
      if (innerWindow) {
        try { innerWindow.postMessage(data, '*'); } catch (e) {}
      }
    } else if (innerWindow && event.source === innerWindow) {
      try { window.parent.postMessage(data, '*'); } catch (e) {}
    }
  });

  function createInnerFrame(p) {
    clearInterval(readyInterval);
    if (innerFrame) innerFrame.remove();
    innerFrame = document.createElement('iframe');
    innerFrame.sandbox = p.sandbox ||
      'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox';
    if (p.allow) innerFrame.allow = p.allow;
    document.body.appendChild(innerFrame);
    innerWindow = innerFrame.contentWindow;
    var doc = innerFrame.contentDocument;
    if (doc && p.html) {
      doc.open();
      doc.write(p.html);
      doc.close();
    }
  }

  function createInnerFrameWithSrc(p) {
    clearInterval(readyInterval);
    if (innerFrame) innerFrame.remove();
    innerFrame = document.createElement('iframe');
    innerFrame.sandbox =
      'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox';
    if (p.allow) innerFrame.allow = p.allow;
    innerFrame.src = p.src;
    innerFrame.style.height = '100%';
    if (p.theme) innerFrame.style.colorScheme = p.theme;

    innerFrame.addEventListener('load', function() {
      innerWindow = innerFrame.contentWindow;
      if (platformScript && innerWindow) {
        try {
          var ps = innerFrame.contentDocument.createElement('script');
          ps.textContent = platformScript;
          innerFrame.contentDocument.head.appendChild(ps);
        } catch (e) {}
      }
      try {
        var fs = innerFrame.contentDocument.createElement('script');
        fs.setAttribute('data-sunpeak-fence', '');
        fs.textContent = PAINT_FENCE_SCRIPT;
        innerFrame.contentDocument.head.appendChild(fs);
      } catch (e) {}
      if (p.theme) {
        try {
          innerFrame.contentDocument.documentElement.style.colorScheme = p.theme;
          var bg = innerFrame.contentDocument.createElement('style');
          bg.setAttribute('data-sunpeak-bg', '');
          bg.textContent = 'html { background-color: var(--color-background-primary, Canvas); }';
          innerFrame.contentDocument.head.appendChild(bg);
        } catch (e) {}
      }
      if (p.styleVars) {
        try {
          var root = innerFrame.contentDocument.documentElement;
          for (var k in p.styleVars) {
            if (p.styleVars[k]) root.style.setProperty(k, p.styleVars[k]);
          }
        } catch (e) {}
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

await mkdir(dirname(OUT_PATH), { recursive: true });
await writeFile(OUT_PATH, HTML, 'utf8');
console.log(`Wrote ${OUT_PATH} (${HTML.length} bytes)`);
