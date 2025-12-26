import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PlaceCard } from './place-card';
import type { Place } from './types';

describe('PlaceCard', () => {
  const mockPlace: Place = {
    id: 'test-place',
    name: 'Test Pizza Place',
    coords: [-122.4194, 37.7749],
    description: 'Delicious test pizza',
    city: 'San Francisco',
    rating: 4.5,
    price: '$$',
    thumbnail: 'https://example.com/test.jpg',
  };

  it('renders place information correctly', () => {
    render(<PlaceCard place={mockPlace} />);

    expect(screen.getByText('Test Pizza Place')).toBeInTheDocument();
    expect(screen.getByText('Delicious test pizza')).toBeInTheDocument();
    expect(screen.getByText('4.5')).toBeInTheDocument();
    expect(screen.getByText('$$', { exact: false })).toBeInTheDocument();
  });

  it('renders thumbnail with correct attributes', () => {
    render(<PlaceCard place={mockPlace} />);

    const image = screen.getByRole('img');
    expect(image).toHaveAttribute('src', 'https://example.com/test.jpg');
    expect(image).toHaveAttribute('alt', 'Test Pizza Place');
    expect(image).toHaveAttribute('loading', 'lazy');
  });

  it('calls onClick handler when clicked', () => {
    const onClick = vi.fn();
    render(<PlaceCard place={mockPlace} onClick={onClick} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('applies selected styles when isSelected is true', () => {
    const { container, rerender } = render(<PlaceCard place={mockPlace} isSelected={false} />);

    let card = container.firstChild as HTMLElement;
    // Should have hover styles but not the active background
    expect(card.className).toContain('hover:bg-black/5');
    // Check that it doesn't have the non-hover background class by looking at the full class string
    const classesWithoutHover = card.className.replace(/hover:[^\s]+/g, '');
    expect(classesWithoutHover).not.toContain('bg-black/5');

    rerender(<PlaceCard place={mockPlace} isSelected={true} />);
    card = container.firstChild as HTMLElement;
    // When selected, should have both hover and non-hover background classes
    expect(card.className).toContain('bg-black/5 dark:bg-white/5');
  });

  it('formats rating to one decimal place', () => {
    const placeWithRating = { ...mockPlace, rating: 4.789 };
    render(<PlaceCard place={placeWithRating} />);

    expect(screen.getByText('4.8')).toBeInTheDocument();
    expect(screen.queryByText('4.789')).not.toBeInTheDocument();
  });

  it('renders price when provided', () => {
    const placeWithPrice = { ...mockPlace, price: '$$$' };
    render(<PlaceCard place={placeWithPrice} />);

    expect(screen.getByText('$$$', { exact: false })).toBeInTheDocument();
  });
});
