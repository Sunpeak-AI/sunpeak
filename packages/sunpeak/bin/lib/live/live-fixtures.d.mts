import type { LiveFixture } from './types.d.mts';

export type { LiveFixture } from './types.d.mts';

export declare const test: {
  (title: string, fn: (args: { live: LiveFixture } & Record<string, any>) => Promise<void>): void;
  describe: (title: string, fn: () => void) => void;
  skip: (title: string, fn: (args: { live: LiveFixture } & Record<string, any>) => Promise<void>) => void;
};

export declare const expect: (...args: any[]) => any;
