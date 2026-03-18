import type { LiveFixture } from './types.d.mts';

/** ChatGPT-specific fixture (alias of LiveFixture for backwards compatibility). */
export type ChatGPTFixture = LiveFixture;

export declare const test: {
  (title: string, fn: (args: { chatgpt: ChatGPTFixture } & Record<string, any>) => Promise<void>): void;
  describe: (title: string, fn: () => void) => void;
  skip: (title: string, fn: (args: { chatgpt: ChatGPTFixture } & Record<string, any>) => Promise<void>) => void;
};

export declare const expect: (...args: any[]) => any;
