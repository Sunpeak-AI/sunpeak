import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';
import { ChatGPTSimulator } from './ChatGPTSimulator';

const lightTheme = createTheme({ palette: { mode: 'light' } });
const darkTheme = createTheme({ palette: { mode: 'dark' } });

describe('ChatGPTSimulator', () => {
  // Store original window.openai
  const originalOpenai = (window as Window & { openai?: unknown }).openai;

  afterEach(() => {
    // Restore original window.openai
    (window as Window & { openai?: unknown }).openai = originalOpenai;
  });

  it('renders user message', () => {
    render(
      <ThemeProvider theme={darkTheme}>
        <ChatGPTSimulator userMessage="Test message">
          <div>Component content</div>
        </ChatGPTSimulator>
      </ThemeProvider>
    );
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('renders children in component slot', () => {
    render(
      <ThemeProvider theme={darkTheme}>
        <ChatGPTSimulator>
          <div data-testid="test-component">Test Component</div>
        </ChatGPTSimulator>
      </ThemeProvider>
    );
    expect(screen.getByTestId('test-component')).toBeInTheDocument();
  });

  it('initializes window.openai with correct properties', () => {
    render(
      <ThemeProvider theme={lightTheme}>
        <ChatGPTSimulator displayMode="inline" colorScheme="light">
          <div>Content</div>
        </ChatGPTSimulator>
      </ThemeProvider>
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
      <ThemeProvider theme={darkTheme}>
        <ChatGPTSimulator showControls={true}>
          <div>Content</div>
        </ChatGPTSimulator>
      </ThemeProvider>
    );
    expect(screen.getByText('Controls')).toBeInTheDocument();
    expect(screen.getAllByText('Color Scheme')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Display Mode')[0]).toBeInTheDocument();
  });

  it('hides controls when showControls is false', () => {
    render(
      <ThemeProvider theme={darkTheme}>
        <ChatGPTSimulator showControls={false}>
          <div>Content</div>
        </ChatGPTSimulator>
      </ThemeProvider>
    );
    expect(screen.queryByText('Controls')).not.toBeInTheDocument();
    expect(screen.queryAllByText('Color Scheme')).toHaveLength(0);
    expect(screen.queryAllByText('Display Mode')).toHaveLength(0);
  });

  it('renders Exit fullscreen button in fullscreen mode', () => {
    render(
      <ThemeProvider theme={darkTheme}>
        <ChatGPTSimulator displayMode="fullscreen">
          <div>Content</div>
        </ChatGPTSimulator>
      </ThemeProvider>
    );
    expect(screen.getByLabelText('Exit fullscreen')).toBeInTheDocument();
  });

  it('does not render Exit fullscreen button in inline mode', () => {
    render(
      <ThemeProvider theme={darkTheme}>
        <ChatGPTSimulator displayMode="inline">
          <div>Content</div>
        </ChatGPTSimulator>
      </ThemeProvider>
    );
    expect(screen.queryByLabelText('Exit fullscreen')).not.toBeInTheDocument();
  });

  it('cleans up window.openai on unmount', () => {
    const { unmount } = render(
      <ThemeProvider theme={darkTheme}>
        <ChatGPTSimulator>
          <div>Content</div>
        </ChatGPTSimulator>
      </ThemeProvider>
    );

    expect(window.openai).toBeDefined();
    unmount();
    expect(window.openai).toBeUndefined();
  });
});
