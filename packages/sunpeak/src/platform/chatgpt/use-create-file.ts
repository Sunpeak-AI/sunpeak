import { useCallback } from 'react';
import { useApp } from '../../hooks/use-app';
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
 * import { useUploadFile } from 'sunpeak/platform/chatgpt';
 *
 * function ImageUploader() {
 *   const uploadFile = useUploadFile();
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
 */
export function useUploadFile(): (file: File) => Promise<OpenAIUploadFileResult> {
  const app = useApp();
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
