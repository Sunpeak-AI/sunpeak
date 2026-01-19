import { getAPI, type WidgetAPI } from '../providers';

/**
 * Hook to get the widget runtime API.
 * Automatically detects and uses the appropriate provider (OpenAI, etc.).
 *
 * @returns The API object, or null if not available.
 */
export function useWidgetAPI(): WidgetAPI | null {
  return getAPI();
}
