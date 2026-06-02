import { describe, expect, it } from 'vitest';
import { isAllowedIconUrl } from './utils';

function withWindowLocation(url: string, callback: () => void) {
  const originalLocation = window.location;
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: new URL(url),
  });
  try {
    callback();
  } finally {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  }
}

describe('isAllowedIconUrl', () => {
  it('allows https and raster data image icons', () => {
    expect(isAllowedIconUrl('https://cdn.example.com/icon.png')).toBe(true);
    expect(isAllowedIconUrl('data:image/png;base64,abc')).toBe(true);
    expect(isAllowedIconUrl('data:image/webp,abc')).toBe(true);
  });

  it('rejects script, file, and SVG data URLs', () => {
    expect(isAllowedIconUrl('javascript:alert(1)')).toBe(false);
    expect(isAllowedIconUrl('file:///tmp/icon.png')).toBe(false);
    expect(isAllowedIconUrl('data:image/svg+xml,<svg></svg>')).toBe(false);
  });

  it('allows http icons while the inspector is running locally', () => {
    withWindowLocation('http://localhost:3000/', () => {
      expect(isAllowedIconUrl('http://localhost:8000/icon.png')).toBe(true);
      expect(isAllowedIconUrl('http://assets.example.com/icon.png')).toBe(true);
    });
  });

  it('rejects local-network icon URLs when the inspector is hosted remotely', () => {
    withWindowLocation('https://inspector.example.com/', () => {
      expect(isAllowedIconUrl('https://localhost/icon.png')).toBe(false);
      expect(isAllowedIconUrl('https://127.0.0.1/icon.png')).toBe(false);
      expect(isAllowedIconUrl('https://192.168.1.10/icon.png')).toBe(false);
      expect(isAllowedIconUrl('https://[::1]/icon.png')).toBe(false);
    });
  });

  it('rejects plain-http icon URLs when the inspector is hosted remotely', () => {
    withWindowLocation('https://inspector.example.com/', () => {
      expect(isAllowedIconUrl('http://assets.example.com/icon.png')).toBe(false);
    });
  });
});
