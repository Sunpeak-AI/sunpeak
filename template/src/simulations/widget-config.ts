/**
 * Default widget configuration for all simulations.
 * Individual simulations can override these values as needed.
 */

export interface WidgetCSP {
  connect_domains: string[];
  resource_domains: string[];
}

export interface WidgetMeta {
  'openai/widgetDomain': string;
  'openai/widgetCSP': WidgetCSP;
}

/**
 * Default widget metadata that can be spread into resource._meta
 *
 * @example
 * // Use default configuration
 * resource: {
 *   _meta: {
 *     ...defaultWidgetMeta,
 *   }
 * }
 *
 * @example
 * // Override specific values
 * resource: {
 *   _meta: {
 *     ...defaultWidgetMeta,
 *     'openai/widgetDomain': 'https://custom.domain.com',
 *   }
 * }
 */
export const defaultWidgetMeta: WidgetMeta = {
  'openai/widgetDomain': 'https://sunpeak.ai', // YOUR DOMAIN HERE.
  'openai/widgetCSP': {
    connect_domains: ['https://sunpeak.ai'], // YOUR API HERE.
    resource_domains: ['https://*.oaistatic.com'], // YOUR CDN HERE (if any).
  },
};
