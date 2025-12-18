/**
 * Resource metadata for the Map resource.
 * This is server-safe and can be imported without pulling in React or CSS.
 */

import { defaultWidgetMeta } from '../simulations/widget-config';

export const mapResourceMeta = {
  uri: 'ui://MapResource',
  name: 'map',
  title: 'Map',
  description: 'Pizza restaurant finder widget',
  mimeType: 'text/html+skybridge',
  _meta: {
    ...defaultWidgetMeta,
    'openai/widgetCSP': {
      ...defaultWidgetMeta['openai/widgetCSP'],
      connect_domains: [
        ...defaultWidgetMeta['openai/widgetCSP'].connect_domains,
        'https://api.mapbox.com',
      ],
      resource_domains: [
        ...defaultWidgetMeta['openai/widgetCSP'].resource_domains,
        'https://api.mapbox.com',
      ],
    },
  },
} as const;
