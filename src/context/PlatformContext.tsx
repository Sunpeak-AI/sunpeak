/**
 * Platform Context
 *
 * Provides the active platform adapter to all Sunpeak components and hooks.
 */

import { createContext, useContext, type ReactNode } from 'react';
import type { PlatformAdapter } from '../types/platform';
import { defaultPlatformRegistry } from '../platforms/registry';

export interface PlatformContextValue {
  adapter: PlatformAdapter | null;
}

const PlatformContext = createContext<PlatformContextValue | null>(null);

export interface PlatformProviderProps {
  /**
   * The platform adapter to use. If not provided, will auto-detect.
   */
  adapter?: PlatformAdapter;

  /**
   * Platform name to use (e.g., 'chatgpt', 'gemini'). If not provided, will auto-detect.
   */
  platform?: string;

  children: ReactNode;
}

/**
 * Platform Provider
 *
 * Wrap your app with this provider to specify which genAI platform to use.
 * If no platform is specified, it will auto-detect the available platform.
 *
 * @example
 * ```tsx
 * import { PlatformProvider } from 'sunpeak';
 *
 * // Auto-detect platform
 * <PlatformProvider>
 *   <App />
 * </PlatformProvider>
 *
 * // Explicitly use ChatGPT
 * <PlatformProvider platform="chatgpt">
 *   <App />
 * </PlatformProvider>
 * ```
 */
export function PlatformProvider({ adapter, platform, children }: PlatformProviderProps) {
  const resolvedAdapter =
    adapter ?? (platform ? defaultPlatformRegistry.get(platform) : null) ?? defaultPlatformRegistry.detect();

  return <PlatformContext.Provider value={{ adapter: resolvedAdapter }}>{children}</PlatformContext.Provider>;
}

/**
 * Hook to access the current platform adapter
 *
 * @internal
 */
export function usePlatformContext(): PlatformContextValue {
  const context = useContext(PlatformContext);

  // If no provider is found, auto-detect the platform
  if (!context) {
    return {
      adapter: defaultPlatformRegistry.detect(),
    };
  }

  return context;
}

/**
 * Hook to access the current platform adapter
 *
 * Returns null if no platform is available or detected.
 */
export function usePlatform(): PlatformAdapter | null {
  const { adapter } = usePlatformContext();
  return adapter;
}
