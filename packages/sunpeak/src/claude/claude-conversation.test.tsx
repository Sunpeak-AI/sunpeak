import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ClaudeConversation } from './claude-conversation';

const defaultProps = {
  screenWidth: 'full' as const,
  displayMode: 'inline' as const,
  platform: 'desktop' as const,
};

describe('ClaudeConversation', () => {
  it('renders user message and children in assistant area', () => {
    render(
      <ClaudeConversation {...defaultProps} userMessage="Hello, show me places">
        <div data-testid="app-ui">App UI Content</div>
      </ClaudeConversation>
    );

    expect(screen.getByText('Hello, show me places')).toBeInTheDocument();
    expect(screen.getByTestId('app-ui')).toBeInTheDocument();
    expect(screen.getByText('App UI Content')).toBeInTheDocument();
  });

  it('renders app name and emoji icon', () => {
    render(
      <ClaudeConversation {...defaultProps} appName="TravelBot" appIcon="✈️">
        <div>Content</div>
      </ClaudeConversation>
    );

    expect(screen.getByText('TravelBot')).toBeInTheDocument();
    expect(screen.getByText('✈️')).toBeInTheDocument();
    expect(screen.getByText('TravelBot said:', { selector: '.sr-only' })).toBeInTheDocument();
  });

  it('renders fullscreen mode with chrome overlay and stable children', () => {
    const { container } = render(
      <ClaudeConversation {...defaultProps} displayMode="fullscreen">
        <div data-testid="fullscreen-content">Fullscreen App</div>
      </ClaudeConversation>
    );

    expect(screen.getByTestId('fullscreen-content')).toBeInTheDocument();
    expect(container.querySelector('footer')).toBeInTheDocument();
    expect(screen.getAllByText('Reply to sunpeak...').length).toBeGreaterThan(0);
    expect(screen.getByLabelText('Back')).toBeInTheDocument();
  });

  it('renders sunpeak.ai header text', () => {
    render(
      <ClaudeConversation {...defaultProps}>
        <div>Content</div>
      </ClaudeConversation>
    );

    expect(screen.getByText('sunpeak.ai')).toBeInTheDocument();
  });

  it('renders pip mode with close button', () => {
    render(
      <ClaudeConversation {...defaultProps} displayMode="pip">
        <div data-testid="pip-content">PiP App</div>
      </ClaudeConversation>
    );

    expect(screen.getByTestId('pip-content')).toBeInTheDocument();
    expect(screen.getByLabelText('Close picture-in-picture')).toBeInTheDocument();
  });
});
