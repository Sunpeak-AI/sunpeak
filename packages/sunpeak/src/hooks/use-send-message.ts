import { useCallback } from 'react';
import type { App } from '@modelcontextprotocol/ext-apps';

/**
 * Content item for a message.
 */
export interface MessageContent {
  type: 'text';
  text: string;
}

/**
 * Parameters for sending a message.
 */
export interface SendMessageParams {
  /** Role must be 'user' for MCP Apps */
  role: 'user';
  /** Content array for the message */
  content: MessageContent[];
}

/**
 * Hook to send follow-up messages to the conversation.
 *
 * Sends a message that appears in the conversation as if the user sent it.
 * Note: Only 'user' role is supported by the MCP Apps protocol.
 *
 * @param app - The MCP App instance (from useApp).
 *
 * @example
 * ```tsx
 * function MyApp() {
 *   const { app } = useApp({ appInfo, capabilities });
 *   const sendMessage = useSendMessage(app);
 *
 *   const handleSubmit = async () => {
 *     await sendMessage({
 *       role: 'user',
 *       content: [{ type: 'text', text: 'Please update the chart' }]
 *     });
 *   };
 *
 *   return <button onClick={handleSubmit}>Request Update</button>;
 * }
 * ```
 */
export function useSendMessage(app: App | null): (params: SendMessageParams) => Promise<void> {
  return useCallback(
    async (params: SendMessageParams) => {
      if (!app) {
        console.warn('[useSendMessage] App not connected');
        return;
      }
      await app.sendMessage(params);
    },
    [app]
  );
}
