import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GenAI } from './GenAI';

describe('GenAI', () => {
  it('renders content correctly', () => {
    const TestApp = GenAI(() => <div>Test content</div>);
    render(<TestApp />);
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('provides platform props to render function', () => {
    const TestApp = GenAI(({ maxHeight, colorScheme }) => (
      <div>
        <span>Max Height: {maxHeight}</span>
        <span>Color Scheme: {colorScheme}</span>
      </div>
    ));
    render(<TestApp />);
    expect(screen.getByText(/Max Height:/)).toBeInTheDocument();
    expect(screen.getByText(/Color Scheme:/)).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const TestApp = GenAI(() => <div>Content</div>);
    const { container } = render(<TestApp className="custom-class" />);
    const app = container.querySelector('.sp-genai-app');
    expect(app).toHaveClass('custom-class');
  });

  it('applies default maxWidth of 800px', () => {
    const TestApp = GenAI(() => <div>Content</div>);
    const { container } = render(<TestApp />);
    const app = container.querySelector('.sp-genai-app');
    expect(app).toHaveStyle({ maxWidth: '800px' });
  });

  it('applies custom maxWidth', () => {
    const TestApp = GenAI(() => <div>Content</div>);
    const { container } = render(<TestApp maxWidth={600} />);
    const app = container.querySelector('.sp-genai-app');
    expect(app).toHaveStyle({ maxWidth: '600px' });
  });

  it('has expected CSS classes', () => {
    const TestApp = GenAI(() => <div>Content</div>);
    const { container } = render(<TestApp />);
    const app = container.querySelector('.sp-genai-app');
    expect(app).toHaveClass('sp-genai-app', 'sp-antialiased');
  });
});
