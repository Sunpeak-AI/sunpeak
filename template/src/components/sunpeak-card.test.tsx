import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { SunpeakCard } from './sunpeak-card';

describe('SunpeakCard', () => {
  it('renders image, header, metadata, and content', () => {
    render(
      <SunpeakCard
        image="https://example.com/image.jpg"
        imageAlt="Test image"
        header="Test Header"
        metadata="Test metadata"
      >
        Card content here
      </SunpeakCard>
    );

    expect(screen.getByRole('img')).toHaveAttribute('src', 'https://example.com/image.jpg');
    expect(screen.getByRole('img')).toHaveAttribute('alt', 'Test image');
    expect(screen.getByText('Test Header')).toBeInTheDocument();
    expect(screen.getByText('Test metadata')).toBeInTheDocument();
    expect(screen.getByText('Card content here')).toBeInTheDocument();
  });

  it('applies variant styles correctly', () => {
    const { rerender } = render(
      <SunpeakCard
        image="https://example.com/image.jpg"
        imageAlt="Test"
        variant="bordered"
        data-testid="card"
      />
    );

    expect(screen.getByTestId('card')).toHaveClass('border-2');

    rerender(
      <SunpeakCard
        image="https://example.com/image.jpg"
        imageAlt="Test"
        variant="elevated"
        data-testid="card"
      />
    );

    expect(screen.getByTestId('card')).toHaveClass('shadow-lg');
  });

  it('renders buttons and handles clicks without propagating to card', async () => {
    const user = userEvent.setup();
    const cardClick = vi.fn();
    const buttonClick = vi.fn();

    render(
      <SunpeakCard
        image="https://example.com/image.jpg"
        imageAlt="Test"
        onClick={cardClick}
        button1={{ children: 'Primary', onClick: buttonClick, isPrimary: true }}
        button2={{ children: 'Secondary', onClick: buttonClick }}
      />
    );

    const primaryButton = screen.getByRole('button', { name: 'Primary' });
    const secondaryButton = screen.getByRole('button', { name: 'Secondary' });

    expect(primaryButton).toBeInTheDocument();
    expect(secondaryButton).toBeInTheDocument();

    await user.click(primaryButton);

    expect(buttonClick).toHaveBeenCalledTimes(1);
    expect(cardClick).not.toHaveBeenCalled();
  });
});
