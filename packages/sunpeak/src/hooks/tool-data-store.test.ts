import { describe, it, expect } from 'vitest';
import type { App } from '@modelcontextprotocol/ext-apps';
import { initToolDataStore } from './tool-data-store';

// Minimal fake App: only the four setter properties initToolDataStore touches
// plus the `__toolDataStore` slot the module augmentation declares.
function fakeApp(): App {
  const obj: Record<string, unknown> = {};
  return obj as unknown as App;
}

describe('initToolDataStore', () => {
  it('attaches a store with the loading initial state', () => {
    const app = fakeApp();
    const store = initToolDataStore(app);

    expect(store).toBe(app.__toolDataStore);
    expect(store.data).toEqual({
      input: null,
      inputPartial: null,
      output: null,
      isError: false,
      isLoading: true,
      isCancelled: false,
      cancelReason: null,
    });
  });

  it('is idempotent — second call returns the same store and does not rewire handlers', () => {
    const app = fakeApp();
    const first = initToolDataStore(app);
    const originalOnToolResult = app.ontoolresult;
    const second = initToolDataStore(app);

    expect(second).toBe(first);
    expect(app.ontoolresult).toBe(originalOnToolResult);
  });

  it('updates the store and notifies listeners when ontoolresult fires before any consumer renders', () => {
    // Reproduces the production race: handler is invoked between the
    // ui/initialize response and the first React commit. useToolData never
    // got a chance to wire its listener yet — but when it eventually
    // subscribes, the store should already hold the result.
    const app = fakeApp();
    const store = initToolDataStore(app);

    app.ontoolresult!({
      structuredContent: { items: [1, 2, 3] },
      content: [],
      isError: false,
    });

    expect(store.data.output).toEqual({ items: [1, 2, 3] });
    expect(store.data.isLoading).toBe(false);
    expect(store.data.isError).toBe(false);
  });

  it('notifies subscribers when a notification updates the store', () => {
    const app = fakeApp();
    const store = initToolDataStore(app);
    let calls = 0;
    store.listeners.add(() => {
      calls++;
    });

    app.ontoolinput!({ arguments: { q: 'hi' } });
    app.ontoolresult!({ structuredContent: { ok: true }, content: [], isError: false });

    expect(calls).toBe(2);
    expect(store.data.input).toEqual({ q: 'hi' });
    expect(store.data.output).toEqual({ ok: true });
  });

  it('marks the store as cancelled with the reason from ontoolcancelled', () => {
    const app = fakeApp();
    const store = initToolDataStore(app);

    app.ontoolcancelled!({ reason: 'user_aborted' });

    expect(store.data.isCancelled).toBe(true);
    expect(store.data.cancelReason).toBe('user_aborted');
    expect(store.data.isLoading).toBe(false);
  });

  it('tracks streaming partials via ontoolinputpartial without clobbering input', () => {
    const app = fakeApp();
    const store = initToolDataStore(app);

    app.ontoolinputpartial!({ arguments: { q: 'he' } });
    expect(store.data.inputPartial).toEqual({ q: 'he' });
    expect(store.data.input).toBeNull();

    app.ontoolinput!({ arguments: { q: 'hello' } });
    expect(store.data.input).toEqual({ q: 'hello' });
    expect(store.data.inputPartial).toBeNull();
  });
});
