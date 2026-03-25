import { createHash } from 'node:crypto';

/**
 * Domain config: a single string (used for all hosts) or a map of
 * host `clientInfo.name` → domain string. Use `'default'` as a fallback
 * key for unmatched hosts.
 */
export type DomainConfig = string | Record<string, string>;

/**
 * Resolve a domain config to a single string for the given host.
 *
 * Lookup order: `map[clientName]` → `map['default']` → `undefined`.
 * If `domain` is a plain string, it's returned as-is regardless of host.
 */
export function resolveDomain(
  domain: DomainConfig | undefined,
  clientName: string | undefined
): string | undefined {
  if (domain === undefined) return undefined;
  if (typeof domain === 'string') return domain;

  // Map lookup: exact match → default fallback
  if (clientName && domain[clientName]) return domain[clientName];
  return domain['default'];
}

/**
 * Compute the Claude sandbox domain for a given MCP server URL.
 *
 * Claude uses the first 32 hex characters of a SHA-256 hash of the server URL
 * as a subdomain of `claudemcpcontent.com`.
 *
 * @example
 * ```ts
 * computeClaudeDomain('https://example.com/mcp')
 * // → 'a904794854a047f6b936c2d62d57a3c0.claudemcpcontent.com'
 * ```
 */
export function computeClaudeDomain(serverUrl: string): string {
  const hash = createHash('sha256').update(serverUrl).digest('hex').slice(0, 32);
  return `${hash}.claudemcpcontent.com`;
}

/**
 * Compute the ChatGPT sandbox domain for a given MCP server URL.
 *
 * ChatGPT derives a subdomain from the server URL by replacing non-alphanumeric
 * characters with hyphens and appending `.oaiusercontent.com`.
 *
 * @example
 * ```ts
 * computeChatGPTDomain('https://www.example.com/mcp')
 * // → 'www-example-com.oaiusercontent.com'
 * ```
 */
export function computeChatGPTDomain(serverUrl: string): string {
  let hostname: string;
  try {
    hostname = new URL(serverUrl).hostname;
  } catch {
    // If the URL is malformed, normalize the whole string
    hostname = serverUrl;
  }
  const slug = hostname.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `${slug}.oaiusercontent.com`;
}

/**
 * Inject a resolved domain into resource metadata.
 *
 * If the `_meta.ui.domain` field is a map (Record), it's resolved to a single
 * string using `clientName`. If it's already a string or absent, the metadata
 * is returned unchanged.
 */
export function injectResolvedDomain(
  meta: Record<string, unknown> | undefined,
  clientName: string | undefined
): Record<string, unknown> | undefined {
  if (!meta) return meta;

  const ui = meta.ui as Record<string, unknown> | undefined;
  if (!ui) return meta;

  const domain = ui.domain;
  if (domain === undefined || typeof domain === 'string') return meta;

  // domain is a Record<string, string> — resolve it
  const resolved = resolveDomain(domain as Record<string, string>, clientName);

  // Destructure to remove the map-typed domain, then set the resolved string (or omit)
  const { domain: _removed, ...restUi } = ui;
  return {
    ...meta,
    ui: {
      ...restUi,
      ...(resolved !== undefined ? { domain: resolved } : {}),
    },
  };
}

/**
 * Auto-compute a default domain for the connecting host when the resource
 * metadata has no domain set.
 *
 * Returns the metadata unchanged if `_meta.ui.domain` is already present.
 * Otherwise, computes a host-appropriate domain from the server URL.
 */
export function injectDefaultDomain(
  meta: Record<string, unknown> | undefined,
  clientName: string | undefined,
  serverUrl: string
): Record<string, unknown> {
  const ui = (meta?.ui as Record<string, unknown>) ?? {};

  // Already has a domain (string from resource config or resolved map) — keep it
  if (typeof ui.domain === 'string') return meta!;

  // Compute a host-appropriate default.
  // ChatGPT reports clientInfo.name as "openai-mcp" or "chatgpt-*".
  let domain: string | undefined;
  if (clientName === 'openai-mcp' || clientName?.startsWith('chatgpt')) {
    domain = computeChatGPTDomain(serverUrl);
  } else if (clientName === 'claude') {
    domain = computeClaudeDomain(serverUrl);
  }

  if (!domain) return meta ?? {};

  return {
    ...meta,
    ui: { ...ui, domain },
  };
}
