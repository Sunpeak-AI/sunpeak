import { usePlatform } from '../context/PlatformContext';
import type { DisplayMode, RequestDisplayMode } from '../types';

/**
 * Hook to request a specific display mode from the platform
 *
 * @example
 * ```tsx
 * const requestDisplayMode = useRequestDisplayMode();
 *
 * const handleClick = async () => {
 *   await requestDisplayMode({ mode: 'fullscreen' });
 * };
 * ```
 */
export function useRequestDisplayMode(): RequestDisplayMode {
  const platform = usePlatform();

  return async (args: { mode: DisplayMode }) => {
    const globals = platform?.getGlobals();

    if (globals?.requestDisplayMode) {
      return await globals.requestDisplayMode(args);
    }

    // Fallback if platform doesn't support requestDisplayMode
    console.warn('requestDisplayMode is not available on this platform');
    return { mode: args.mode };
  };
}
