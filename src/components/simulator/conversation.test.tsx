import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Conversation } from './conversation';

const defaultProps = {
  screenWidth: 'full' as const,
  displayMode: 'inline' as const,
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

  it('renders custom app name and emoji icon', () => {
    render(
      <Conversation {...defaultProps} appName="TravelBot" appIcon="✈️">
        <div>Content</div>
      </Conversation>
    );

    expect(screen.getByText('TravelBot')).toBeInTheDocument();
    expect(screen.getByText('✈️')).toBeInTheDocument();
    expect(screen.getByText('TravelBot said:', { selector: '.sr-only' })).toBeInTheDocument();
  });

  it('renders simplified layout in fullscreen mode without header', () => {
    const { container } = render(
      <Conversation {...defaultProps} displayMode="fullscreen">
        <div data-testid="fullscreen-content">Fullscreen App</div>
      </Conversation>
    );

    expect(screen.getByTestId('fullscreen-content')).toBeInTheDocument();
    expect(screen.queryByText('ChatGPT')).not.toBeInTheDocument();
    expect(container.querySelector('header')).not.toBeInTheDocument();
    expect(container.querySelector('footer')).not.toBeInTheDocument();
  });
});
