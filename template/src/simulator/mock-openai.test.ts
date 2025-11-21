import { describe, it, expect, afterEach, vi } from 'vitest';
import { initMockOpenAI } from './mock-openai';

describe('MockOpenAI', () => {
  afterEach(() => {
    if (global.window && (global.window as unknown as { openai?: unknown }).openai) {
      delete (global.window as unknown as { openai?: unknown }).openai;
    }
  });

  it('should initialize with default values', () => {
    const mock = initMockOpenAI();

    expect(mock.theme).toBe('light');
    expect(mock.displayMode).toBe('inline');
    expect(mock.locale).toBe('en-US');
    expect(mock.maxHeight).toBe(600);
    expect(mock.widgetState).toBeNull();
  });

  it('should set theme correctly', () => {
    const mock = initMockOpenAI();
    mock.setTheme('dark');
    expect(mock.theme).toBe('dark');
  });

  it('should set display mode correctly', () => {
    const mock = initMockOpenAI();
    mock.setDisplayMode('fullscreen');
    expect(mock.displayMode).toBe('fullscreen');
  });

  it('should set widget state correctly', async () => {
    const mock = initMockOpenAI();
    const state = { key: 'value' };
    await mock.setWidgetState(state);
    expect(mock.widgetState).toEqual(state);
  });

  it('should have correct userAgent defaults', () => {
    const mock = initMockOpenAI();
    expect(mock.userAgent.device.type).toBe('desktop');
    expect(mock.userAgent.capabilities.hover).toBe(true);
    expect(mock.userAgent.capabilities.touch).toBe(false);
  });

  it('should call tool and return result', async () => {
    const mock = initMockOpenAI();
    const result = await mock.callTool('testTool', { arg: 'value' });
    expect(result.result).toBeDefined();
    expect(typeof result.result).toBe('string');
  });

  it('should handle sendFollowUpMessage', async () => {
    const mock = initMockOpenAI();
    const consoleSpy = vi.spyOn(console, 'log');
    await mock.sendFollowUpMessage({ prompt: 'test prompt' });
    expect(consoleSpy).toHaveBeenCalledWith('Mock sendFollowUpMessage:', 'test prompt');
    consoleSpy.mockRestore();
  });

  it('should request display mode', async () => {
    const mock = initMockOpenAI();
    const result = await mock.requestDisplayMode({ mode: 'pip' });
    expect(result.mode).toBe('pip');
    expect(mock.displayMode).toBe('pip');
  });
});
