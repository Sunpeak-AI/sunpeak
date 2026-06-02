import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function currentPageIsLoopback(): boolean {
  if (typeof window === 'undefined') return true;
  return isLocalNetworkHostname(window.location.hostname);
}

function normalizeHostname(hostname: string): string {
  return hostname.toLowerCase().replace(/^\[(.*)\]$/, '$1');
}

function isLocalNetworkHostname(hostname: string): boolean {
  const host = normalizeHostname(hostname);
  if (host === 'localhost' || host === '0.0.0.0' || host === '::1') return true;
  if (host.startsWith('127.')) return true;

  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const octets = ipv4.slice(1).map(Number);
    if (octets.some((octet) => octet < 0 || octet > 255)) return false;
    const [a, b] = octets;
    return (
      a === 10 ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 169 && b === 254)
    );
  }

  return host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80:');
}

/**
 * Returns true when `icon` is safe to use as the `src` of an `<img>` rendered
 * inside the inspector chrome. Accepts https URLs, local http URLs while the
 * inspector itself is running locally, and `data:image/*` URIs for raster image
 * types only. SVG data URIs are rejected because they can include
 * `<script>`/event handlers that execute when the document parses the inline
 * document (the `<img>` tag itself does not run scripts in modern browsers,
 * but adjacent <object>/<embed>/<iframe> renders would). Anything else (emoji,
 * plain text, javascript:, file:, etc.) falls through to the text-rendering
 * path that already handles emoji icons.
 */
export function isAllowedIconUrl(icon: string): boolean {
  if (/^data:image\/(?:png|jpeg|gif|webp)(?:[;,]|$)/i.test(icon)) {
    return true;
  }

  let url: URL;
  try {
    url = new URL(icon);
  } catch {
    return false;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;

  const inspectorIsLocal = currentPageIsLoopback();
  if (isLocalNetworkHostname(url.hostname) && !inspectorIsLocal) return false;

  // Remote inspectors should not cause visitor browsers to request arbitrary
  // plain-HTTP URLs from untrusted MCP server metadata. Local inspectors keep
  // http support for development servers.
  if (url.protocol === 'http:' && !inspectorIsLocal) return false;

  return true;
}
