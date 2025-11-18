import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card } from './Card';

describe('Card', () => {
  const defaultProps = {
    image: 'https://sunpeak.ai/images/sun.svg',
    imageAlt: 'Test image',
    imageMaxWidth: 400,
    imageMaxHeight: 400,
  };

  it('renders children correctly', () => {
    render(<Card {...defaultProps}>Test content</Card>);
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('renders with header', () => {
    render(<Card {...defaultProps} header="Test Header">Content</Card>);
    expect(screen.getByText('Test Header')).toBeInTheDocument();
  });

  it('renders with metadata', () => {
    render(<Card {...defaultProps} metadata="⭐ 4.5">Content</Card>);
    expect(screen.getByText('⭐ 4.5')).toBeInTheDocument();
  });

  it('renders with button1', () => {
    const onClick = vi.fn();
    render(
      <Card
        {...defaultProps}
        button1={{
          children: 'First Button',
          onClick,
        }}
      >
        Content
      </Card>
    );
    expect(screen.getByText('First Button')).toBeInTheDocument();
  });

  it('renders with button2', () => {
    const onClick = vi.fn();
    render(
      <Card
        {...defaultProps}
        button2={{
          children: 'Second Button',
          onClick,
        }}
      >
        Content
      </Card>
    );
    expect(screen.getByText('Second Button')).toBeInTheDocument();
  });

  it('renders with both buttons', () => {
    const onClick1 = vi.fn();
    const onClick2 = vi.fn();
    render(
      <Card
        {...defaultProps}
        button1={{
          children: 'Button 1',
          onClick: onClick1,
          isPrimary: true,
        }}
        button2={{
          children: 'Button 2',
          onClick: onClick2,
        }}
      >
        Content
      </Card>
    );
    expect(screen.getByText('Button 1')).toBeInTheDocument();
    expect(screen.getByText('Button 2')).toBeInTheDocument();
  });

  it('renders with image', () => {
    render(
      <Card {...defaultProps}>
        Content
      </Card>
    );
    const img = screen.getByAltText('Test image');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://sunpeak.ai/images/sun.svg');
  });

  it('applies bordered variant class', () => {
    const { container } = render(<Card {...defaultProps} variant="bordered">Content</Card>);
    const card = container.querySelector('.sp-card');
    expect(card).toHaveClass('sp-card-bordered');
  });

  it('applies elevated variant class', () => {
    const { container } = render(<Card {...defaultProps} variant="elevated">Content</Card>);
    const card = container.querySelector('.sp-card');
    expect(card).toHaveClass('sp-card-elevated');
  });

  it('applies custom className', () => {
    const { container } = render(<Card {...defaultProps} className="custom-class">Content</Card>);
    const card = container.querySelector('.sp-card');
    expect(card).toHaveClass('custom-class');
  });

  it('has the class sp-card-inline', () => {
    const { container } = render(<Card {...defaultProps}>Content</Card>);
    const card = container.querySelector('.sp-card');
    expect(card).toHaveClass('sp-card-inline');
  });
});
