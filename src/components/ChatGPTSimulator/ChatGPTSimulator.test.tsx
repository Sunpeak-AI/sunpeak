import { describe, it, expect, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChatGPTSimulator } from './ChatGPTSimulator';

describe('ChatGPTSimulator', () => {
  // Store original window.openai
  const originalOpenai = (global.window as Window & { openai?: unknown }).openai;

  afterEach(() => {
    // Restore original window.openai
    (global.window as Window & { openai?: unknown }).openai = originalOpenai;
  });

  it('renders user message', () => {
    render(
      <ChatGPTSimulator userMessage="Test message">
        <div>Component content</div>
      </ChatGPTSimulator>
    );
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('renders children in component slot', () => {
    render(
      <ChatGPTSimulator>
        <div data-testid="test-component">Test Component</div>
      </ChatGPTSimulator>
    );
    expect(screen.getByTestId('test-component')).toBeInTheDocument();
  });

  it('initializes window.openai with correct properties', () => {
    render(
      <ChatGPTSimulator displayMode="inline" colorScheme="light">
        <div>Content</div>
      </ChatGPTSimulator>
    );

    const openai = window.openai;
    expect(openai).toBeDefined();
    expect(openai?.displayMode).toBe('inline');
    expect(openai?.colorScheme).toBe('light');
    expect(openai?.callTool).toBeDefined();
    expect(openai?.sendFollowUpMessage).toBeDefined();
    expect(openai?.openExternal).toBeDefined();
    expect(openai?.requestDisplayMode).toBeDefined();
    expect(openai?.setWidgetState).toBeDefined();
  });

  it('renders controls when showControls is true', () => {
    render(
      <ChatGPTSimulator showControls={true}>
        <div>Content</div>
      </ChatGPTSimulator>
    );
    expect(screen.getByText('Controls')).toBeInTheDocument();
    expect(screen.getByText('Color Scheme')).toBeInTheDocument();
    expect(screen.getByText('Display Mode')).toBeInTheDocument();
  });

  it('hides controls when showControls is false', () => {
    render(
      <ChatGPTSimulator showControls={false}>
        <div>Content</div>
      </ChatGPTSimulator>
    );
    expect(screen.queryByText('Controls')).not.toBeInTheDocument();
    expect(screen.queryByText('Color Scheme')).not.toBeInTheDocument();
    expect(screen.queryByText('Display Mode')).not.toBeInTheDocument();
  });

  it('applies correct color scheme class', () => {
    const { container } = render(
      <ChatGPTSimulator colorScheme="dark">
        <div>Content</div>
      </ChatGPTSimulator>
    );
    const simulator = container.querySelector('.chatgpt-simulator');
    expect(simulator).toHaveClass('chatgpt-simulator--dark');
  });

  it('sets display mode data attribute', () => {
    const { container } = render(
      <ChatGPTSimulator displayMode="fullscreen">
        <div>Content</div>
      </ChatGPTSimulator>
    );
    const simulator = container.querySelector('.chatgpt-simulator');
    expect(simulator).toHaveAttribute('data-display-mode', 'fullscreen');
  });

  it('cleans up window.openai on unmount', () => {
    const { unmount } = render(
      <ChatGPTSimulator>
        <div>Content</div>
      </ChatGPTSimulator>
    );

    expect(window.openai).toBeDefined();
    unmount();
    expect(window.openai).toBeUndefined();
  });
});
