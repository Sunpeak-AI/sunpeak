/**
 * Active app selection - SINGLE SOURCE OF TRUTH
 *
 * 👇 CHANGE THIS LINE to switch which app is active for the:
 * - ChatGPT build (index.chatgpt.tsx)
 * - MCP server (server.ts)
 */

export type AppName = 'app' | 'albums' | 'carousel';

export const ACTIVE_APP: AppName = 'app';
