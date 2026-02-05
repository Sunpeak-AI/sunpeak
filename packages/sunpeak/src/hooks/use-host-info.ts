import type { App } from '@modelcontextprotocol/ext-apps';

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
 * @param app - The MCP App instance (from useApp).
 *
 * @example
 * ```tsx
 * function MyApp() {
 *   const { app } = useApp({ appInfo, capabilities });
 *   const { hostVersion, hostCapabilities } = useHostInfo(app);
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
export function useHostInfo(app: App | null): {
  /** Host application version info */
  hostVersion: HostVersion | undefined;
  /** Host capabilities */
  hostCapabilities: HostCapabilities | undefined;
} {
  return {
    hostVersion: app?.getHostVersion() as HostVersion | undefined,
    hostCapabilities: app?.getHostCapabilities() as HostCapabilities | undefined,
  };
}
