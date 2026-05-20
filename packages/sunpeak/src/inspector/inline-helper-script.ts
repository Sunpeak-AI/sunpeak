/**
 * Inline helper script injected into resource HTML alongside the paint-fence
 * and platform-runtime scripts. It performs the MCP Apps `ui/initialize`
 * handshake on behalf of the resource and exposes a friendly callback API
 * via `window.sunpeak.{onToolInput, onToolInputPartial, onToolResult,
 * onToolCancelled, onHostContextChange}`.
 *
 * This exists so embedders can ship plain HTML resources (e.g. a hardcoded
 * `<html>…</html>` string they pass via `app.resources[].html`) without
 * bundling the MCP Apps SDK. Without this helper, the host buffers tool
 * inputs and results forever — the SDK's initialize gate would never close.
 *
 * Opt-out: resource HTML that already uses the MCP Apps SDK can disable the
 * helper by including `<meta name="sunpeak-helper" content="off">` in its
 * `<head>`. Without the opt-out, the helper and the SDK both send
 * `ui/initialize` and the host bridge logs a (harmless) double-init warning.
 *
 * The helper is intentionally protocol-compatible: from the host's view it
 * looks like a regular MCP Apps client completing the handshake. The host
 * then unbuffers and delivers the queued notifications normally.
 */

// Kept in sync with `LATEST_PROTOCOL_VERSION` in `@modelcontextprotocol/ext-apps`.
// The drift guard in `sandbox-static.test.ts` doesn't cover this string, so
// when bumping the ext-apps dependency, search for this constant.
const PROTOCOL_VERSION = '2026-01-26';

export const SUNPEAK_INLINE_HELPER_SCRIPT = `
(function() {
  if (window.sunpeak) return; // already installed (e.g. parent hot-reload)
  // Opt-out: resource HTML using the real MCP Apps SDK can suppress the
  // helper to avoid sending two ui/initialize requests. Manual lowercase
  // comparison so content="off" / "OFF" / "Off" all match (the Selectors
  // L4 case-insensitive flag isn't supported in all test environments).
  try {
    var metas = document.querySelectorAll('meta[name="sunpeak-helper"]');
    for (var mi = 0; mi < metas.length; mi++) {
      var contentAttr = metas[mi].getAttribute('content');
      if (contentAttr && contentAttr.toLowerCase() === 'off') return;
    }
  } catch (e) { /* document not ready or querySelector missing */ }

  var listeners = {
    toolInput: [],
    toolInputPartial: [],
    toolResult: [],
    toolCancelled: [],
    hostContext: []
  };
  var last = {
    toolInput: undefined,
    toolInputPartial: undefined,
    toolResult: undefined,
    toolCancelled: undefined,
    hostContext: undefined
  };
  function dispatch(channel, value) {
    last[channel] = value;
    // Iterate over a SNAPSHOT — callbacks that unsubscribe themselves
    // mutate the live list, which would skip subsequent callbacks under a
    // for-by-index loop on the original array.
    var list = listeners[channel].slice();
    for (var i = 0; i < list.length; i++) {
      try { list[i](value); } catch (e) { console.error('[sunpeak] callback error:', e); }
    }
  }
  // Map channel names to the public method name for error messages.
  var channelMethodName = {
    toolInput: 'onToolInput',
    toolInputPartial: 'onToolInputPartial',
    toolResult: 'onToolResult',
    toolCancelled: 'onToolCancelled',
    hostContext: 'onHostContextChange'
  };
  function subscribe(channel) {
    return function(cb) {
      if (typeof cb !== 'function') {
        throw new TypeError('window.sunpeak.' + channelMethodName[channel] + ' expects a function');
      }
      listeners[channel].push(cb);
      if (last[channel] !== undefined) {
        try { cb(last[channel]); } catch (e) { console.error('[sunpeak] callback error:', e); }
      }
      return function unsubscribe() {
        var idx = listeners[channel].indexOf(cb);
        if (idx >= 0) listeners[channel].splice(idx, 1);
      };
    };
  }

  window.sunpeak = {
    onToolInput: subscribe('toolInput'),
    onToolInputPartial: subscribe('toolInputPartial'),
    onToolResult: subscribe('toolResult'),
    onToolCancelled: subscribe('toolCancelled'),
    onHostContextChange: subscribe('hostContext')
  };

  var nextId = 1;
  var pending = {};

  function sendRequest(method, params) {
    var id = nextId++;
    return new Promise(function(resolve, reject) {
      pending[id] = { resolve: resolve, reject: reject };
      try {
        window.parent.postMessage({ jsonrpc: '2.0', id: id, method: method, params: params }, '*');
      } catch (e) {
        delete pending[id];
        reject(e);
      }
    });
  }
  function sendNotification(method, params) {
    try {
      window.parent.postMessage({ jsonrpc: '2.0', method: method, params: params || {} }, '*');
    } catch (e) { /* parent detached */ }
  }

  window.addEventListener('message', function(ev) {
    // Only trust messages from the actual parent (the sandbox proxy).
    // Without this guard, a sibling iframe in the same browsing context or
    // a browser extension content script could forge JSON-RPC notifications
    // and drive the embedder's onToolResult/onToolInput callbacks with
    // attacker-controlled data.
    if (ev.source !== window.parent) return;
    var msg = ev.data;
    if (!msg || typeof msg !== 'object' || msg.jsonrpc !== '2.0') return;
    if (typeof msg.id !== 'undefined' && pending[msg.id]) {
      var p = pending[msg.id];
      delete pending[msg.id];
      if (msg.error) p.reject(new Error((msg.error && msg.error.message) || 'request error'));
      else p.resolve(msg.result);
      return;
    }
    if (msg.method === 'ui/notifications/tool-input') {
      dispatch('toolInput', (msg.params && msg.params.arguments) || {});
    } else if (msg.method === 'ui/notifications/tool-input-partial') {
      dispatch('toolInputPartial', (msg.params && msg.params.arguments) || {});
    } else if (msg.method === 'ui/notifications/tool-result') {
      // tool-result params are the CallToolResult directly per the spec.
      dispatch('toolResult', msg.params || {});
    } else if (msg.method === 'ui/notifications/tool-cancelled') {
      // Clear cached input / partial / result so a late onToolResult
      // subscriber doesn't get the cancelled-then-stale value replayed.
      // hostContext stays — the environment hasn't changed.
      last.toolInput = undefined;
      last.toolInputPartial = undefined;
      last.toolResult = undefined;
      dispatch('toolCancelled', msg.params || {});
    } else if (msg.method === 'ui/notifications/host-context-changed') {
      dispatch('hostContext', msg.params || {});
    }
  });

  sendRequest('ui/initialize', {
    appInfo: { name: 'sunpeak-inline-helper', version: '1.0.0' },
    appCapabilities: {},
    protocolVersion: '${PROTOCOL_VERSION}'
  }).then(function() {
    sendNotification('ui/notifications/initialized');
  }).catch(function(err) {
    console.warn('[sunpeak] ui/initialize failed:', err && err.message);
  });
})();
`.trim();
