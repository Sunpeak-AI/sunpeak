import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders children correctly', () => {
    const onClick = vi.fn();
    render(
      <Button onClick={onClick}>
        Click me
      </Button>
    );
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('applies primary class when isPrimary is true', () => {
    const onClick = vi.fn();
    const { container } = render(
      <Button isPrimary onClick={onClick}>
        Primary
      </Button>
    );
    const button = container.querySelector('.sp-button');
    expect(button).toHaveClass('sp-button-primary');
  });

  it('applies secondary class by default', () => {
    const onClick = vi.fn();
    const { container } = render(
      <Button onClick={onClick}>
        Secondary
      </Button>
    );
    const button = container.querySelector('.sp-button');
    expect(button).toHaveClass('sp-button-secondary');
  });

  it('applies secondary class when isPrimary is false', () => {
    const onClick = vi.fn();
    const { container } = render(
      <Button isPrimary={false} onClick={onClick}>
        Secondary
      </Button>
    );
    const button = container.querySelector('.sp-button');
    expect(button).toHaveClass('sp-button-secondary');
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(
      <Button onClick={onClick}>
        Click me
      </Button>
    );
    fireEvent.click(screen.getByText('Click me'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('applies custom className', () => {
    const onClick = vi.fn();
    const { container } = render(
      <Button onClick={onClick} className="custom-class">
        Button
      </Button>
    );
    const button = container.querySelector('.sp-button');
    expect(button).toHaveClass('custom-class');
  });

  it('defaults to type="button"', () => {
    const onClick = vi.fn();
    render(
      <Button onClick={onClick}>
        Button
      </Button>
    );
    const button = screen.getByText('Button');
    expect(button).toHaveAttribute('type', 'button');
  });

  it('accepts custom type prop', () => {
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} type="submit">
        Submit
      </Button>
    );
    const button = screen.getByText('Submit');
    expect(button).toHaveAttribute('type', 'submit');
  });
});
