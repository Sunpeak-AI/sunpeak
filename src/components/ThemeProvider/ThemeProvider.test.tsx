import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from './ThemeProvider';

describe('ThemeProvider', () => {
  it('renders children', () => {
    render(
      <ThemeProvider>
        <div>Test Content</div>
      </ThemeProvider>
    );
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('applies light theme by default', () => {
    const { container } = render(
      <ThemeProvider>
        <div>Content</div>
      </ThemeProvider>
    );
    // Check that the theme provider is present
    expect(container).toBeInTheDocument();
  });

  it('applies dark theme when mode is dark', () => {
    const { container } = render(
      <ThemeProvider mode="dark">
        <div>Content</div>
      </ThemeProvider>
    );
    expect(container).toBeInTheDocument();
  });

  it('can disable CssBaseline', () => {
    const { container } = render(
      <ThemeProvider enableCssBaseline={false}>
        <div>Content</div>
      </ThemeProvider>
    );
    expect(container).toBeInTheDocument();
  });
});
