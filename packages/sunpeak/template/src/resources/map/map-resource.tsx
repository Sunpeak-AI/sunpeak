import { SafeArea } from 'sunpeak';
import type { ResourceConfig } from 'sunpeak';
import { Map } from './components/map';

export const resource: ResourceConfig = {
  name: 'map',
  title: 'Map',
  description: 'Pizza restaurant finder widget',
  mimeType: 'text/html;profile=mcp-app',
  _meta: {
    ui: {
      domain: 'https://sunpeak.ai',
      csp: {
        connectDomains: ['https://api.mapbox.com', 'https://events.mapbox.com'],
        resourceDomains: [
          'https://cdn.sunpeak.ai',
          'https://cdn.openai.com',
          'https://api.mapbox.com',
          'https://events.mapbox.com',
        ],
      },
    },
  },
};

/**
 * Production-ready Map Resource
 *
 * This resource displays a pizza restaurant finder with an interactive map,
 * place listings, and detailed inspector view.
 * Can be dropped into any production environment without changes.
 */
export function MapResource() {
  return (
    <SafeArea className="h-full">
      <Map />
    </SafeArea>
  );
}
