/**
 * ChatGPT-specific hooks wrapping `window.openai` runtime APIs.
 *
 * These provide typed React hooks for ChatGPT platform features that are
 * not part of the MCP Apps standard: file uploads, host modals, and
 * instant checkout.
 *
 * Always feature-detect before use — these hooks throw if the underlying
 * `window.openai` method is not available (i.e. outside ChatGPT).
 *
 * @example
 * ```tsx
 * import { useUploadFile, useRequestModal } from 'sunpeak/host/chatgpt';
 * ```
 *
 * @see https://developers.openai.com/apps-sdk/mcp-apps-in-chatgpt
 * @module sunpeak/host/chatgpt
 */

// === Types for the window.openai runtime ===
export { getOpenAIRuntime } from './openai-types';
export type { OpenAIRuntime } from './openai-types';

// === File actions ===
export { useUploadFile } from './use-create-file';
export type { CreateFileResult } from './use-create-file';

// === Modal actions ===
export { useRequestModal } from './use-open-modal';
export type { OpenModalParams } from './use-open-modal';

// === Checkout ===
export { useRequestCheckout } from './use-request-checkout';
export type { CheckoutSession, CheckoutOrder } from './use-request-checkout';
