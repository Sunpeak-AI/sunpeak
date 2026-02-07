import { useCallback } from 'react';
import { useApp } from './use-app';

/**
 * Log levels for structured logging.
 */
export type LogLevel = 'debug' | 'info' | 'warning' | 'error' | 'critical';

/**
 * Parameters for sending a log message.
 */
export interface SendLogParams {
  /** Log level */
  level: LogLevel;
  /** Log data (string or object) */
  data: unknown;
  /** Optional logger name for categorization */
  logger?: string;
}

/**
 * Hook to send structured log messages to the host.
 *
 * Sends logs through the MCP protocol rather than just console.log.
 * Useful for debugging in production where console isn't accessible.
 *
 * @example
 * ```tsx
 * function MyApp() {
 *   const sendLog = useSendLog();
 *
 *   const handleAction = () => {
 *     sendLog({ level: 'info', data: 'User clicked button' });
 *     sendLog({
 *       level: 'debug',
 *       data: { action: 'click', target: 'submit' },
 *       logger: 'analytics'
 *     });
 *   };
 *
 *   return <button onClick={handleAction}>Click Me</button>;
 * }
 * ```
 */
export function useSendLog(): (params: SendLogParams) => void {
  const app = useApp();
  return useCallback(
    (params: SendLogParams) => {
      if (!app) {
        // Fall back to console when not connected
        const consoleFn =
          params.level === 'error' || params.level === 'critical'
            ? console.error
            : params.level === 'warning'
              ? console.warn
              : params.level === 'debug'
                ? console.debug
                : console.log;
        consoleFn(`[${params.logger ?? 'app'}]`, params.data);
        return;
      }
      app.sendLog(params);
    },
    [app]
  );
}
