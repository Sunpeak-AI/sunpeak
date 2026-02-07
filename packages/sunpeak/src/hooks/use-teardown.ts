import { useEffect, useRef } from 'react';
import type { App } from '@modelcontextprotocol/ext-apps';
import { useApp } from './use-app';

/**
 * Per-app subscriber registry.
 * The App class only supports a single onteardown callback,
 * so we multiplex it to allow multiple hook instances to subscribe.
 */
const registries = new WeakMap<App, Set<() => Promise<void> | void>>();

function getRegistry(app: App): Set<() => Promise<void> | void> {
  let subs = registries.get(app);
  if (!subs) {
    subs = new Set();
    registries.set(app, subs);

    app.onteardown = async () => {
      for (const fn of subs!) await fn();
      return {};
    };
  }
  return subs;
}

/**
 * Hook to register a cleanup callback before the app is unmounted.
 *
 * The callback runs when the host signals teardown, before the iframe is destroyed.
 * Use this for cleanup that must complete before unmount (e.g., saving state).
 * Multiple components can safely call this hook — all callbacks will run.
 *
 * @param callback - Async function to run on teardown.
 *
 * @example
 * ```tsx
 * function MyApp() {
 *   const [data, setData] = useState({});
 *
 *   useTeardown(async () => {
 *     await saveToServer(data);
 *   });
 *
 *   return <Editor data={data} onChange={setData} />;
 * }
 * ```
 */
export function useTeardown(callback: () => Promise<void> | void): void {
  const app = useApp();
  const callbackRef = useRef(callback);

  // Keep callback ref up to date
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!app) return;

    const subs = getRegistry(app);
    const wrapper = () => callbackRef.current();
    subs.add(wrapper);

    return () => {
      subs.delete(wrapper);
    };
  }, [app]);
}
