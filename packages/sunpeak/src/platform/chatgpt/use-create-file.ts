import { useCallback } from 'react';
import type { App } from '@modelcontextprotocol/ext-apps';
import { getOpenAIRuntime, type OpenAIUploadFileResult } from './openai-types';

export type { OpenAIUploadFileResult as CreateFileResult };

/**
 * Upload a file from the app UI into the ChatGPT conversation.
 *
 * Wraps `window.openai.uploadFile` which is only available inside ChatGPT.
 * Supported formats: `image/png`, `image/jpeg`, `image/webp`.
 *
 * Import from `sunpeak/platform/chatgpt`:
 *
 * @example
 * ```tsx
 * import { useApp } from 'sunpeak';
 * import { useUploadFile } from 'sunpeak/platform/chatgpt';
 *
 * function ImageUploader() {
 *   const { app } = useApp({ appInfo, capabilities });
 *   const uploadFile = useUploadFile(app);
 *
 *   const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
 *     const file = e.currentTarget.files?.[0];
 *     if (!file) return;
 *     const { fileId } = await uploadFile(file);
 *     console.log('Uploaded:', fileId);
 *   };
 *
 *   return <input type="file" accept="image/*" onChange={handleChange} />;
 * }
 * ```
 *
 * @param app - The MCP App instance (from useApp).
 */
export function useUploadFile(app: App | null): (file: File) => Promise<OpenAIUploadFileResult> {
  return useCallback(
    async (file: File) => {
      if (!app) {
        throw new Error('[useUploadFile] App not connected');
      }
      const runtime = getOpenAIRuntime();
      if (!runtime?.uploadFile) {
        throw new Error('[useUploadFile] window.openai.uploadFile not available');
      }
      return runtime.uploadFile(file);
    },
    [app]
  );
}
