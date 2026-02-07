import { useCallback } from 'react';
import { useApp } from './use-app';

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
 *
 * @example
 * ```tsx
 * function MyApp() {
 *   const sendMessage = useSendMessage();
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
export function useSendMessage(): (params: SendMessageParams) => Promise<void> {
  const app = useApp();
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
