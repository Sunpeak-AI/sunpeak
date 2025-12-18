/**
 * Resource metadata for the Carousel resource.
 * This is server-safe and can be imported without pulling in React or CSS.
 */

import { defaultWidgetMeta } from '../simulations/widget-config';

export const carouselResourceMeta = {
  uri: 'ui://CarouselResource',
  name: 'carousel',
  title: 'Carousel',
  description: 'Show popular places to visit widget markup',
  mimeType: 'text/html+skybridge',
  _meta: {
    ...defaultWidgetMeta,
  },
} as const;
