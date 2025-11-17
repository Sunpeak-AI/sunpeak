/**
 * Platform Registry
 *
 * Manages multiple platform adapters and auto-detects the active platform.
 */

import type { PlatformAdapter } from '../types/platform';
import { chatgptPlatform } from './chatgpt';

export interface PlatformRegistry {
  /**
   * Register a platform adapter
   */
  register(adapter: PlatformAdapter): void;

  /**
   * Get a specific platform adapter by name
   */
  get(name: string): PlatformAdapter | null;

  /**
   * Auto-detect and return the active platform
   * Returns the first available platform in the registry
   */
  detect(): PlatformAdapter | null;

  /**
   * Get all registered platforms
   */
  getAll(): PlatformAdapter[];
}

class DefaultPlatformRegistry implements PlatformRegistry {
  private adapters = new Map<string, PlatformAdapter>();

  constructor() {
    // Register default platforms
    this.register(chatgptPlatform);
  }

  register(adapter: PlatformAdapter): void {
    this.adapters.set(adapter.name, adapter);
  }

  get(name: string): PlatformAdapter | null {
    return this.adapters.get(name) ?? null;
  }

  detect(): PlatformAdapter | null {
    // Return the first available platform
    for (const adapter of this.adapters.values()) {
      if (adapter.isAvailable()) {
        return adapter;
      }
    }
    return null;
  }

  getAll(): PlatformAdapter[] {
    return Array.from(this.adapters.values());
  }
}

/**
 * Create a new platform registry
 */
export function createPlatformRegistry(): PlatformRegistry {
  return new DefaultPlatformRegistry();
}

/**
 * Default platform registry instance
 */
export const defaultPlatformRegistry = createPlatformRegistry();
