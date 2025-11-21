import { describe, it, expect } from 'vitest';
import { SET_GLOBALS_EVENT_TYPE } from './openai';

describe('OpenAI Types', () => {
  it('should export SET_GLOBALS_EVENT_TYPE constant', () => {
    expect(SET_GLOBALS_EVENT_TYPE).toBe('openai:set_globals');
  });

  it('should have correct event type value', () => {
    expect(typeof SET_GLOBALS_EVENT_TYPE).toBe('string');
    expect(SET_GLOBALS_EVENT_TYPE.length).toBeGreaterThan(0);
  });
});
