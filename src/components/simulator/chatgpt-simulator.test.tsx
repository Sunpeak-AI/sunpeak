import { render, screen } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import { ChatGPTSimulator } from './chatgpt-simulator';

describe('ChatGPTSimulator', () => {
  afterEach(() => {
    delete (window as unknown as { openai?: unknown }).openai;
  });

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
    expect(screen.getByText('App UI')).toBeInTheDocument();
    expect(screen.getByText('Color Scheme')).toBeInTheDocument();
    expect(screen.getByText('Display Mode')).toBeInTheDocument();
    expect(screen.getByText('Body Width')).toBeInTheDocument();
  });

  it('initializes mock OpenAI on window object', () => {
    render(
      <ChatGPTSimulator>
        <div>Content</div>
      </ChatGPTSimulator>
    );

    const openai = (window as unknown as { openai?: unknown }).openai;
    expect(openai).toBeDefined();
    expect(openai).toHaveProperty('setTheme');
    expect(openai).toHaveProperty('setDisplayMode');
  });
});
