import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { OpenAICard } from './openai-card';

describe('OpenAICard', () => {
  it('renders correct variant classes', () => {
    const { container, rerender } = render(
      <OpenAICard variant="default" data-testid="card">
        Content
      </OpenAICard>
    );

    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('border border-subtle bg-surface');

    rerender(
      <OpenAICard variant="bordered" data-testid="card">
        Content
      </OpenAICard>
    );
    expect(card.className).toContain('border-2 border-default bg-surface');

    rerender(
      <OpenAICard variant="elevated" data-testid="card">
        Content
      </OpenAICard>
    );
    expect(card.className).toContain('shadow-lg');
  });

  it('button clicks stop propagation and do not trigger card onClick', () => {
    const cardOnClick = vi.fn();
    const button1OnClick = vi.fn();

    render(
      <OpenAICard
        onClick={cardOnClick}
        button1={{ onClick: button1OnClick, children: 'Click Me' }}
      >
        Content
      </OpenAICard>
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
      <OpenAICard
        button1={{ onClick: button1OnClick, children: 'Button 1', isPrimary: true }}
        button2={{ onClick: button2OnClick, children: 'Button 2' }}
      >
        Content
      </OpenAICard>
    );

    const button1 = screen.getByText('Button 1');
    const button2 = screen.getByText('Button 2');

    fireEvent.click(button1);
    expect(button1OnClick).toHaveBeenCalledTimes(1);

    fireEvent.click(button2);
    expect(button2OnClick).toHaveBeenCalledTimes(1);
  });
});
