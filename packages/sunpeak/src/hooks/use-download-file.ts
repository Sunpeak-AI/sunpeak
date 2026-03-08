import { useCallback } from 'react';
import type { McpUiDownloadFileRequest } from '@modelcontextprotocol/ext-apps';
import { useApp } from './use-app';

/**
 * Parameters for downloading a file through the host.
 */
export type DownloadFileParams = McpUiDownloadFileRequest['params'];

/**
 * Result from a file download request.
 */
export interface DownloadFileResult {
  /** Whether the download failed (e.g. user cancelled or host denied). */
  isError?: boolean;
}

/**
 * Hook to download files through the host.
 *
 * Since MCP Apps run in sandboxed iframes where direct downloads are blocked,
 * this provides a host-mediated mechanism for file exports. Supports embedded
 * text/binary content and resource links.
 *
 * @example
 * ```tsx
 * function ExportButton({ data }: { data: unknown }) {
 *   const downloadFile = useDownloadFile();
 *
 *   const handleExport = async () => {
 *     await downloadFile({
 *       contents: [{
 *         type: 'resource',
 *         resource: {
 *           uri: 'file:///export.json',
 *           mimeType: 'application/json',
 *           text: JSON.stringify(data, null, 2),
 *         },
 *       }],
 *     });
 *   };
 *
 *   return <button onClick={handleExport}>Export JSON</button>;
 * }
 * ```
 */
export function useDownloadFile(): (
  params: DownloadFileParams
) => Promise<DownloadFileResult | undefined> {
  const app = useApp();
  return useCallback(
    async (params: DownloadFileParams) => {
      if (!app) {
        console.warn('[useDownloadFile] App not connected');
        return undefined;
      }
      return app.downloadFile(params);
    },
    [app]
  );
}
