import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
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
      <ClaudeConversation {...defaultProps} displayMode="fullscreen" screenWidth="tablet">
        <div data-testid="fullscreen-content">Fullscreen App</div>
      </ClaudeConversation>
    );

    const fullscreenContent = screen.getByTestId('fullscreen-content');
    expect(fullscreenContent).toBeInTheDocument();
    expect((fullscreenContent.closest('.fixed') as HTMLElement).style.maxWidth).toBe('');
    expect(container.querySelector('footer')).toBeInTheDocument();
    expect(screen.getAllByPlaceholderText('Reply to sunpeak...').length).toBeGreaterThan(0);
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

  it('lets users type and submit chat messages', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onSubmit = vi.fn();
    render(
      <ClaudeConversation
        {...defaultProps}
        chatInput="hello"
        onChatInputChange={onChange}
        onChatSubmit={onSubmit}
        chatMessages={[{ id: '1', role: 'user', content: 'show albums' }]}
      >
        <div data-testid="app-ui">App UI Content</div>
      </ClaudeConversation>
    );

    await user.type(screen.getByRole('textbox'), '!');
    await user.click(screen.getByLabelText('Send message'));

    expect(onChange).toHaveBeenCalled();
    expect(onSubmit).toHaveBeenCalled();
    expect(screen.getByText('show albums')).toBeInTheDocument();
  });

  it('positions chat status above the composer without shifting it', () => {
    render(
      <ClaudeConversation
        {...defaultProps}
        chatInput=""
        onChatInputChange={vi.fn()}
        onChatSubmit={vi.fn()}
        chatStatus="Thinking..."
      >
        <div data-testid="app-ui">App UI Content</div>
      </ClaudeConversation>
    );

    expect(screen.getByText('Thinking...')).toHaveClass('absolute', 'bottom-full');
  });

  it('renders a model tool call with the app below it', () => {
    render(
      <ClaudeConversation
        {...defaultProps}
        chatMessages={[
          {
            id: '1',
            role: 'assistant',
            content: 'Here are the albums.',
            toolCalls: [{ name: 'show_albums', arguments: { category: 'travel' } }],
            rendersApp: true,
          },
        ]}
      >
        <div data-testid="app-ui">App UI Content</div>
      </ClaudeConversation>
    );

    expect(screen.getByText('Here are the albums.')).toBeInTheDocument();
    expect(screen.getByText('Tool call: show_albums')).toBeInTheDocument();
    expect(screen.getByTestId('app-ui')).toBeInTheDocument();
    expect(
      screen
        .getByTestId('app-ui')
        .compareDocumentPosition(screen.getByText('Here are the albums.')) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });
});
