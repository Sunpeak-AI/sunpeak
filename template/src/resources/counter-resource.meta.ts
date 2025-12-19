/**
 * Resource metadata for the Counter resource.
 * This is server-safe and can be imported without pulling in React or CSS.
 */

import { defaultWidgetMeta } from '../simulations/widget-config';

export const counterResourceMeta = {
  name: 'counter',
  title: 'Counter',
  description: 'Show a simple counter tool widget markup',
  mimeType: 'text/html+skybridge',
  _meta: {
    ...defaultWidgetMeta,
  },
} as const;
