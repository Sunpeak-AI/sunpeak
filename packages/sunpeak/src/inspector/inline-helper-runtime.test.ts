/**
 * Runtime behavior tests for the inline helper. The helper is a string of JS
 * we inject into resource HTML, so the tests evaluate the script against a
 * fresh happy-dom window and drive its postMessage / DOM interactions
 * directly.
 *
 * Covers the round-5 fixes:
 *   - Dispatch iterates a snapshot, so a self-unsubscribing callback doesn't
 *     skip later callbacks.
 *   - tool-cancelled clears cached tool-input / tool-result so late
 *     subscribers don't get stale replays.
 *   - <meta name="sunpeak-helper" content="off"> opt-out matches
 *     case-insensitively.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { Window } from 'happy-dom';
import { SUNPEAK_INLINE_HELPER_SCRIPT } from './inline-helper-script';

// Each test gets a fresh window with a stubbed `parent` we can flush
// messages from. The helper's `window.parent.postMessage` becomes a
// recorder; our test sends inbound messages by firing MessageEvent on
// the helper's window directly with `source: realParent`.
function makeWindow(opts: { metaContent?: string } = {}) {
  const w = new Window().window as unknown as Window & { parent: Window };
  // happy-dom defaults `parent === window`, which is exactly what the
  // helper's `ev.source !== window.parent` guard needs.
  const sent: Array<Record<string, unknown>> = [];
  (w as unknown as { parent: unknown }).parent = w;
  (w.parent as unknown as { postMessage: (d: unknown) => void }).postMessage = (
    data: unknown
  ) => {
    sent.push(data as Record<string, unknown>);
  };
  // Optional meta-tag opt-out
  if (opts.metaContent != null) {
    const meta = w.document.createElement('meta');
    meta.setAttribute('name', 'sunpeak-helper');
    meta.setAttribute('content', opts.metaContent);
    w.document.head.appendChild(meta);
  }
  // Evaluate the helper script in the window's global scope
  // by using new Function with `window` injected.
  const fn = new Function('window', 'document', SUNPEAK_INLINE_HELPER_SCRIPT);
  fn(w as unknown, w.document as unknown);
  return { w, sent };
}

function fireIncoming(
  w: Window & { parent: Window },
  data: Record<string, unknown>
): void {
  // The helper checks `ev.source !== window.parent`. Use the window's own
  // MessageEvent constructor and dispatcher so happy-dom's types line up.
  const ev = new (w as unknown as { MessageEvent: typeof MessageEvent }).MessageEvent(
    'message',
    { data, source: w.parent as unknown as MessageEventSource }
  );
  // Happy-dom's Window#dispatchEvent expects happy-dom's Event subtype, not
  // lib.dom's. Cast through unknown to satisfy strict TS.
  (w as unknown as { dispatchEvent: (e: unknown) => boolean }).dispatchEvent(ev);
}

describe('inline helper runtime', () => {
  describe('basic dispatch', () => {
    let env: ReturnType<typeof makeWindow>;
    beforeEach(() => {
      env = makeWindow();
    });

    it('exposes window.sunpeak with all five callback methods', () => {
      // @ts-expect-error helper attaches to window
      const sp = env.w.sunpeak;
      expect(typeof sp.onToolInput).toBe('function');
      expect(typeof sp.onToolInputPartial).toBe('function');
      expect(typeof sp.onToolResult).toBe('function');
      expect(typeof sp.onToolCancelled).toBe('function');
      expect(typeof sp.onHostContextChange).toBe('function');
    });

    it('sends a ui/initialize request on install', () => {
      const initialize = env.sent.find((m) => m.method === 'ui/initialize');
      expect(initialize).toBeDefined();
      expect(initialize).toMatchObject({
        jsonrpc: '2.0',
        method: 'ui/initialize',
      });
    });

    it('delivers a tool-result to a registered onToolResult', () => {
      const seen: unknown[] = [];
      // @ts-expect-error helper attaches to window
      env.w.sunpeak.onToolResult((r: unknown) => seen.push(r));
      fireIncoming(env.w, {
        jsonrpc: '2.0',
        method: 'ui/notifications/tool-result',
        params: { content: [{ type: 'text', text: 'hi' }], structuredContent: { x: 1 } },
      });
      expect(seen).toHaveLength(1);
      expect(seen[0]).toMatchObject({ structuredContent: { x: 1 } });
    });

    it('replays the last delivered value to late subscribers', () => {
      fireIncoming(env.w, {
        jsonrpc: '2.0',
        method: 'ui/notifications/tool-input',
        params: { arguments: { a: 1 } },
      });
      const seen: unknown[] = [];
      // @ts-expect-error helper attaches to window
      env.w.sunpeak.onToolInput((args: unknown) => seen.push(args));
      expect(seen).toEqual([{ a: 1 }]);
    });

    it('throws TypeError naming the actual method when given a non-function', () => {
      // @ts-expect-error helper attaches to window
      const sp = env.w.sunpeak;
      expect(() => sp.onToolResult('not a fn')).toThrow(/onToolResult/);
    });
  });

  describe('self-unsubscribe during dispatch', () => {
    it('does not skip subsequent callbacks when one unsubscribes itself', () => {
      const env = makeWindow();
      const seen: string[] = [];
      // @ts-expect-error helper attaches to window
      const sp = env.w.sunpeak;
      // A registers a callback that unsubscribes itself when called
      const unsubA = sp.onToolResult(() => {
        seen.push('A');
        unsubA();
      });
      sp.onToolResult(() => seen.push('B'));
      sp.onToolResult(() => seen.push('C'));
      fireIncoming(env.w, {
        jsonrpc: '2.0',
        method: 'ui/notifications/tool-result',
        params: {},
      });
      // All three should fire on the first delivery. Without the snapshot
      // fix, B would be skipped (A's splice shifts B into A's index, the
      // for-loop increments past it).
      expect(seen).toEqual(['A', 'B', 'C']);
      // On a second delivery only B and C should fire (A unsubscribed)
      seen.length = 0;
      fireIncoming(env.w, {
        jsonrpc: '2.0',
        method: 'ui/notifications/tool-result',
        params: {},
      });
      expect(seen).toEqual(['B', 'C']);
    });
  });

  describe('cancellation clears cached input/result', () => {
    it('does not replay tool-input/result to subscribers registered after cancellation', () => {
      const env = makeWindow();
      // Deliver an input and result first
      fireIncoming(env.w, {
        jsonrpc: '2.0',
        method: 'ui/notifications/tool-input',
        params: { arguments: { x: 1 } },
      });
      fireIncoming(env.w, {
        jsonrpc: '2.0',
        method: 'ui/notifications/tool-result',
        params: { structuredContent: { y: 2 } },
      });
      // Then a cancellation
      fireIncoming(env.w, {
        jsonrpc: '2.0',
        method: 'ui/notifications/tool-cancelled',
        params: {},
      });
      // Late subscribers should NOT see the stale values
      const seenInputs: unknown[] = [];
      const seenResults: unknown[] = [];
      // @ts-expect-error helper attaches to window
      env.w.sunpeak.onToolInput((v: unknown) => seenInputs.push(v));
      // @ts-expect-error helper attaches to window
      env.w.sunpeak.onToolResult((v: unknown) => seenResults.push(v));
      expect(seenInputs).toEqual([]);
      expect(seenResults).toEqual([]);
    });

    it('still replays host-context (which is unaffected by tool cancellation)', () => {
      const env = makeWindow();
      fireIncoming(env.w, {
        jsonrpc: '2.0',
        method: 'ui/notifications/host-context-changed',
        params: { theme: 'dark' },
      });
      fireIncoming(env.w, {
        jsonrpc: '2.0',
        method: 'ui/notifications/tool-cancelled',
        params: {},
      });
      const seen: unknown[] = [];
      // @ts-expect-error helper attaches to window
      env.w.sunpeak.onHostContextChange((v: unknown) => seen.push(v));
      expect(seen).toEqual([{ theme: 'dark' }]);
    });
  });

  describe('meta-tag opt-out', () => {
    it('does NOT install window.sunpeak when <meta content="off"> is present', () => {
      const env = makeWindow({ metaContent: 'off' });
      // @ts-expect-error helper attaches to window
      expect(env.w.sunpeak).toBeUndefined();
    });

    it('matches the meta value case-insensitively', () => {
      for (const v of ['OFF', 'Off', 'oFf']) {
        const env = makeWindow({ metaContent: v });
        // @ts-expect-error helper attaches to window
        expect(env.w.sunpeak, `expected sunpeak undefined for content="${v}"`).toBeUndefined();
      }
    });

    it('does NOT opt out for other content values', () => {
      const env = makeWindow({ metaContent: 'on' });
      // @ts-expect-error helper attaches to window
      expect(env.w.sunpeak).toBeDefined();
    });
  });

  describe('security: ignores messages from non-parent sources', () => {
    it('drops a message whose source is not window.parent', () => {
      const env = makeWindow();
      const seen: unknown[] = [];
      // @ts-expect-error helper attaches to window
      env.w.sunpeak.onToolResult((v: unknown) => seen.push(v));
      // Fire an event with source set to something OTHER than window.parent.
      const ev = new (env.w as unknown as { MessageEvent: typeof MessageEvent }).MessageEvent(
        'message',
        {
          data: {
            jsonrpc: '2.0',
            method: 'ui/notifications/tool-result',
            params: { structuredContent: { forged: true } },
          },
          source: {} as MessageEventSource,
        }
      );
      (env.w as unknown as { dispatchEvent: (e: unknown) => boolean }).dispatchEvent(ev);
      expect(seen).toEqual([]);
    });
  });
});
