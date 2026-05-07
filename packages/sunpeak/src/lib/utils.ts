import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Returns true when `icon` is safe to use as the `src` of an `<img>` rendered
 * inside the inspector chrome. Accepts http(s) URLs and `data:image/*` URIs
 * for raster image types only. SVG data URIs are rejected because they can
 * include `<script>`/event handlers that execute when the document parses
 * the inline document (the `<img>` tag itself does not run scripts in modern
 * browsers, but adjacent <object>/<embed>/<iframe> renders would). Anything
 * else (emoji, plain text, javascript:, file:, etc.) falls through to the
 * text-rendering path that already handles emoji icons.
 */
export function isAllowedIconUrl(icon: string): boolean {
  if (icon.startsWith('https://') || icon.startsWith('http://')) return true;
  if (
    icon.startsWith('data:image/png') ||
    icon.startsWith('data:image/jpeg') ||
    icon.startsWith('data:image/gif') ||
    icon.startsWith('data:image/webp')
  ) {
    return true;
  }
  return false;
}
