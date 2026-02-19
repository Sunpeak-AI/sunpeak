import { SafeArea } from 'sunpeak';
import type { ResourceConfig } from 'sunpeak';
import { Albums } from './components/albums';

export const resource: ResourceConfig = {
  name: 'albums',
  title: 'Albums',
  description: 'Show photo albums widget',
  mimeType: 'text/html;profile=mcp-app',
  _meta: {
    ui: {
      domain: 'https://sunpeak.ai',
      csp: {
        resourceDomains: ['https://cdn.sunpeak.ai', 'https://cdn.openai.com'],
      },
    },
  },
};

/**
 * Production-ready Albums Resource
 *
 * This resource displays photo albums in a carousel layout with fullscreen viewing capability.
 * Can be dropped into any production environment without changes.
 */
export function AlbumsResource() {
  return (
    <SafeArea>
      <Albums />
    </SafeArea>
  );
}
