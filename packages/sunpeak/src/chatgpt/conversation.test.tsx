import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Conversation } from './conversation';

const defaultProps = {
  screenWidth: 'full' as const,
  displayMode: 'inline' as const,
  platform: 'desktop' as const,
};

describe('Conversation', () => {
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

  it('renders fullscreen mode with chrome overlay and stable children', () => {
    const { container } = render(
      <Conversation {...defaultProps} displayMode="fullscreen">
        <div data-testid="fullscreen-content">Fullscreen App</div>
      </Conversation>
    );

    // Children stay mounted at stable tree position
    expect(screen.getByTestId('fullscreen-content')).toBeInTheDocument();
    // Fullscreen chrome overlay has a footer with input
    expect(container.querySelector('footer')).toBeInTheDocument();
    expect(screen.getAllByPlaceholderText('Message sunpeak.ai').length).toBeGreaterThan(0);
    // Fullscreen header has a close button
    expect(screen.getByLabelText('Close')).toBeInTheDocument();
  });
});
