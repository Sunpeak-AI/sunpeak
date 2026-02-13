import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Card } from './card';

describe('Card', () => {
  it('renders correct variant classes', () => {
    const { container, rerender } = render(
      <Card variant="default" data-testid="card">
        Content
      </Card>
    );

    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('border border-subtle bg-surface');

    rerender(
      <Card variant="bordered" data-testid="card">
        Content
      </Card>
    );
    expect(card.className).toContain('border-2 border-default bg-surface');

    rerender(
      <Card variant="elevated" data-testid="card">
        Content
      </Card>
    );
    expect(card.className).toContain('shadow-lg');
  });

  it('button clicks stop propagation and do not trigger card onClick', () => {
    const cardOnClick = vi.fn();
    const button1OnClick = vi.fn();

    render(
      <Card onClick={cardOnClick} button1={{ onClick: button1OnClick, children: 'Click Me' }}>
        Content
      </Card>
    );

    const button = screen.getByText('Click Me');
    fireEvent.click(button);

    expect(button1OnClick).toHaveBeenCalledTimes(1);
    expect(cardOnClick).not.toHaveBeenCalled();
  });

  it('calls button onClick handlers when buttons are clicked', () => {
    const button1OnClick = vi.fn();
    const button2OnClick = vi.fn();

    render(
      <Card
        button1={{ onClick: button1OnClick, children: 'Button 1', isPrimary: true }}
        button2={{ onClick: button2OnClick, children: 'Button 2' }}
      >
        Content
      </Card>
    );

    const button1 = screen.getByText('Button 1');
    const button2 = screen.getByText('Button 2');

    fireEvent.click(button1);
    expect(button1OnClick).toHaveBeenCalledTimes(1);

    fireEvent.click(button2);
    expect(button2OnClick).toHaveBeenCalledTimes(1);
  });
});
