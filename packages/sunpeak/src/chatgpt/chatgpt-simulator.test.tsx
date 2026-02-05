import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ChatGPTSimulator } from './chatgpt-simulator';

describe('ChatGPTSimulator', () => {
  it('renders children in the conversation area', () => {
    render(
      <ChatGPTSimulator>
        <div data-testid="app-content">My App Content</div>
      </ChatGPTSimulator>
    );

    expect(screen.getByTestId('app-content')).toBeInTheDocument();
    expect(screen.getByText('My App Content')).toBeInTheDocument();
  });

  it('renders sidebar with all control labels', () => {
    render(
      <ChatGPTSimulator>
        <div>Content</div>
      </ChatGPTSimulator>
    );

    expect(screen.getByText('Controls')).toBeInTheDocument();
    expect(screen.getByText('Theme')).toBeInTheDocument();
    expect(screen.getByText('Display Mode')).toBeInTheDocument();
    expect(screen.getByText('Simulation Width')).toBeInTheDocument();
  });

  it('does not use window.openai (uses McpAppHost instead)', () => {
    render(
      <ChatGPTSimulator>
        <div>Content</div>
      </ChatGPTSimulator>
    );

    const openai = (window as unknown as { openai?: unknown }).openai;
    expect(openai).toBeUndefined();
  });
});
