import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Conversation } from './conversation';
import { initMockOpenAI, type MockOpenAI } from './mock-openai';

const defaultProps = {
  screenWidth: 'full' as const,
};

describe('Conversation', () => {
  let mock: MockOpenAI;

  beforeEach(() => {
    mock = initMockOpenAI({ displayMode: 'inline' });
  });

  afterEach(() => {
    delete (window as unknown as { openai?: unknown }).openai;
  });

  it('renders user message and children in assistant area', () => {
    render(
      <Conversation {...defaultProps} userMessage="Hello, show me places">
        <div data-testid="app-ui">App UI Content</div>
      </Conversation>
    );

    expect(screen.getByText('Hello, show me places')).toBeInTheDocument();
    expect(screen.getByTestId('app-ui')).toBeInTheDocument();
    expect(screen.getByText('App UI Content')).toBeInTheDocument();
  });

  it('renders app name and emoji icon', () => {
    render(
      <Conversation {...defaultProps} appName="TravelBot" appIcon="✈️">
        <div>Content</div>
      </Conversation>
    );

    expect(screen.getByText('TravelBot')).toBeInTheDocument();
    expect(screen.getByText('✈️')).toBeInTheDocument();
    expect(screen.getByText('TravelBot said:', { selector: '.sr-only' })).toBeInTheDocument();
  });

  it('renders simplified layout in fullscreen mode with footer', () => {
    // Set displayMode to fullscreen via window.openai
    mock.displayMode = 'fullscreen';

    const { container } = render(
      <Conversation {...defaultProps}>
        <div data-testid="fullscreen-content">Fullscreen App</div>
      </Conversation>
    );

    expect(screen.getByTestId('fullscreen-content')).toBeInTheDocument();
    expect(screen.queryByText('sunpeak.ai')).not.toBeInTheDocument();
    expect(container.querySelector('header')).not.toBeInTheDocument();
    expect(container.querySelector('footer')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Message sunpeak.ai')).toBeInTheDocument();
  });
});
