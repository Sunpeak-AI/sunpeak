import { useCallback } from 'react';
import { useApp } from './use-app';
import { useHostContext } from './use-host-context';

/**
 * Display modes available for apps.
 */
export type AppDisplayMode = 'inline' | 'pip' | 'fullscreen';

/**
 * Hook to request a display mode change.
 *
 * Returns a function to request display mode changes and the list of available modes.
 * Always check `availableModes` before requesting a mode change.
 *
 * @example
 * ```tsx
 * function MyApp() {
 *   const { requestDisplayMode, availableModes } = useRequestDisplayMode();
 *
 *   return (
 *     <>
 *       {availableModes?.includes('fullscreen') && (
 *         <button onClick={() => requestDisplayMode('fullscreen')}>
 *           Fullscreen
 *         </button>
 *       )}
 *       {availableModes?.includes('pip') && (
 *         <button onClick={() => requestDisplayMode('pip')}>
 *           Picture-in-Picture
 *         </button>
 *       )}
 *     </>
 *   );
 * }
 * ```
 */
export function useRequestDisplayMode(): {
  /** Request a display mode change */
  requestDisplayMode: (mode: AppDisplayMode) => Promise<void>;
  /** List of display modes the host supports */
  availableModes: AppDisplayMode[] | undefined;
} {
  const app = useApp();
  const hostContext = useHostContext();

  const requestDisplayMode = useCallback(
    async (mode: AppDisplayMode) => {
      if (!app) {
        console.warn('[useRequestDisplayMode] App not connected');
        return;
      }
      await app.requestDisplayMode({ mode });
    },
    [app]
  );

  return {
    requestDisplayMode,
    availableModes: hostContext?.availableDisplayModes as AppDisplayMode[] | undefined,
  };
}
