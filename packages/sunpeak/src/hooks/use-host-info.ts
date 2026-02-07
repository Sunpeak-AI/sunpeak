import { useApp } from './use-app';

/**
 * Host version information.
 */
export interface HostVersion {
  /** Name of the host application */
  name: string;
  /** Version of the host application */
  version: string;
}

/**
 * Host capabilities indicating what features are supported.
 */
export interface HostCapabilities {
  /** Whether the host supports calling server tools */
  serverTools?: boolean;
  /** Whether the host supports opening external links */
  openLinks?: boolean;
  /** Whether the host supports structured logging */
  logging?: boolean;
  /** Whether the host supports sending messages */
  messages?: boolean;
  /** Whether the host supports display mode changes */
  displayModes?: boolean;
  /** Additional capability flags */
  [key: string]: unknown;
}

/**
 * Hook to get information about the host application.
 *
 * Returns the host's version and capabilities. Use capabilities to check
 * what features are available before using them.
 *
 * @example
 * ```tsx
 * function MyApp() {
 *   const { hostVersion, hostCapabilities } = useHostInfo();
 *
 *   return (
 *     <div>
 *       <p>Running in: {hostVersion?.name} v{hostVersion?.version}</p>
 *       {hostCapabilities?.serverTools && (
 *         <button>Call Server Tool</button>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useHostInfo(): {
  /** Host application version info */
  hostVersion: HostVersion | undefined;
  /** Host capabilities */
  hostCapabilities: HostCapabilities | undefined;
} {
  const app = useApp();
  return {
    hostVersion: app?.getHostVersion() as HostVersion | undefined,
    hostCapabilities: app?.getHostCapabilities() as HostCapabilities | undefined,
  };
}
