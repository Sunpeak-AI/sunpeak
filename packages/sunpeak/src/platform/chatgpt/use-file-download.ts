import { useCallback } from 'react';
import type { App } from '@modelcontextprotocol/ext-apps';
import { getOpenAIRuntime, type OpenAIFileDownloadUrlResult } from './openai-types';

export type { OpenAIFileDownloadUrlResult as FileDownloadUrlResult };

/**
 * Get a temporary download URL for a file by its ID.
 *
 * Wraps `window.openai.getFileDownloadUrl` which is only available inside
 * ChatGPT. Use this to retrieve URLs for files uploaded via {@link useUploadFile}
 * or file IDs received in tool parameters.
 *
 * Import from `sunpeak/platform/chatgpt`:
 *
 * @example
 * ```tsx
 * import { useApp } from 'sunpeak';
 * import { useGetFileDownloadUrl } from 'sunpeak/platform/chatgpt';
 *
 * function FilePreview({ fileId }: { fileId: string }) {
 *   const { app } = useApp({ appInfo, capabilities });
 *   const getFileDownloadUrl = useGetFileDownloadUrl(app);
 *   const [src, setSrc] = useState<string>();
 *
 *   useEffect(() => {
 *     getFileDownloadUrl({ fileId }).then(({ downloadUrl }) => setSrc(downloadUrl));
 *   }, [fileId, getFileDownloadUrl]);
 *
 *   return src ? <img src={src} /> : <p>Loading...</p>;
 * }
 * ```
 *
 * @param app - The MCP App instance (from useApp).
 */
export function useGetFileDownloadUrl(
  app: App | null
): (params: { fileId: string }) => Promise<OpenAIFileDownloadUrlResult> {
  return useCallback(
    async (params: { fileId: string }) => {
      if (!app) {
        throw new Error('[useGetFileDownloadUrl] App not connected');
      }
      const runtime = getOpenAIRuntime();
      if (!runtime?.getFileDownloadUrl) {
        throw new Error('[useGetFileDownloadUrl] window.openai.getFileDownloadUrl not available');
      }
      return runtime.getFileDownloadUrl(params);
    },
    [app]
  );
}
