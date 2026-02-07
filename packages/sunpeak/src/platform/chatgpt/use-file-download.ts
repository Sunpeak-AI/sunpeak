import { useCallback } from 'react';
import { useApp } from '../../hooks/use-app';
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
 * import { useGetFileDownloadUrl } from 'sunpeak/platform/chatgpt';
 *
 * function FilePreview({ fileId }: { fileId: string }) {
 *   const getFileDownloadUrl = useGetFileDownloadUrl();
 *   const [src, setSrc] = useState<string>();
 *
 *   useEffect(() => {
 *     getFileDownloadUrl({ fileId }).then(({ downloadUrl }) => setSrc(downloadUrl));
 *   }, [fileId, getFileDownloadUrl]);
 *
 *   return src ? <img src={src} /> : <p>Loading...</p>;
 * }
 * ```
 */
export function useGetFileDownloadUrl(): (params: {
  fileId: string;
}) => Promise<OpenAIFileDownloadUrlResult> {
  const app = useApp();
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
