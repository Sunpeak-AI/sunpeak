/**
 * Resource metadata for the Albums resource.
 * This is server-safe and can be imported without pulling in React or CSS.
 */

import { defaultWidgetMeta } from '../simulations/widget-config';

export const albumsResourceMeta = {
  name: 'albums',
  title: 'Albums',
  description: 'Show photo albums widget markup',
  mimeType: 'text/html+skybridge',
  _meta: {
    ...defaultWidgetMeta,
  },
} as const;
