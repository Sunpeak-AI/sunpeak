import { useCallback, useSyncExternalStore } from 'react';
import type { App, McpUiHostContext, McpUiStyles } from '@modelcontextprotocol/ext-apps';
import {
  applyDocumentTheme,
  applyHostStyleVariables,
  applyHostFonts,
} from '@modelcontextprotocol/ext-apps';
import { useApp } from './use-app';
import { DEFAULT_STYLE_VARIABLES } from '../lib/default-style-variables';

/**
 * Per-app subscriber registry.
 * The App class only supports a single onhostcontextchanged callback,
 * so we multiplex it to allow multiple hook instances to subscribe.
 *
 * Also applies `data-theme` and `color-scheme` to the document element
 * so that CSS selectors like `[data-theme="dark"]` and Tailwind's `dark:`
 * variant work automatically.
 */
const registries = new WeakMap<App, Set<() => void>>();

/**
 * Apply style variables to the document, falling back to defaults.
 * Host-provided variables override defaults since they're applied after.
 */
function applyStyles(variables: McpUiStyles | undefined) {
  // Always apply defaults first so all CSS variables are defined
  applyHostStyleVariables(DEFAULT_STYLE_VARIABLES);
  // Override with host-provided values (if any)
  if (variables) {
    applyHostStyleVariables(variables);
  }
}

function getRegistry(app: App): Set<() => void> {
  let subs = registries.get(app);
  if (!subs) {
    subs = new Set();
    registries.set(app, subs);

    // Apply initial theme and style variables from the host context received during initialization
    const ctx = app.getHostContext();
    if (ctx?.theme) {
      applyDocumentTheme(ctx.theme);
    }
    applyStyles(ctx?.styles?.variables);
    if (ctx?.styles?.css?.fonts) {
      applyHostFonts(ctx.styles.css.fonts);
    }

    // Debounce timer for subscriber notifications.
    // Some hosts (e.g. ChatGPT) fire hostcontextchanged at hundreds of Hz while
    // the LLM is generating text, oscillating containerDimensions between two
    // values. Debouncing coalesces these rapid bursts into a single re-render
    // so SafeArea and other dimension-sensitive components don't flicker.
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    app.onhostcontextchanged = () => {
      // Read the full context from the app rather than relying on the
      // callback params, which may be a delta missing unchanged fields
      // like styles when only the theme toggled.
      const ctx = app.getHostContext();
      if (ctx?.theme) {
        applyDocumentTheme(ctx.theme);
      }
      applyStyles(ctx?.styles?.variables);
      if (ctx?.styles?.css?.fonts) {
        applyHostFonts(ctx.styles.css.fonts);
      }
      // Notify subscribers after a brief settling period.
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        for (const fn of subs!) fn();
      }, 50);
    };
  }
  return subs;
}

/**
 * Reactive access to the MCP Apps host context.
 * Subscribes to host context changes and re-renders when the context updates.
 *
 * @returns The current host context, or null if not connected.
 */
export function useHostContext(): McpUiHostContext | null {
  const app = useApp();

  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!app) return () => {};
      const subs = getRegistry(app);
      subs.add(onChange);
      return () => {
        subs.delete(onChange);
      };
    },
    [app]
  );

  const getSnapshot = useCallback(() => {
    return app?.getHostContext() ?? null;
  }, [app]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
