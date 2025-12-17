import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PlaceCarousel } from './place-carousel';
import type { Place } from '../../simulations/map-simulation';

describe('PlaceCarousel', () => {
  const mockPlaces: Place[] = [
    {
      id: 'place-1',
      name: 'First Place',
      coords: [-122.4194, 37.7749],
      description: 'First test place',
      city: 'San Francisco',
      rating: 4.5,
      price: '$$',
      thumbnail: 'https://example.com/1.jpg',
    },
    {
      id: 'place-2',
      name: 'Second Place',
      coords: [-122.4094, 37.7849],
      description: 'Second test place',
      city: 'Oakland',
      rating: 4.2,
      price: '$',
      thumbnail: 'https://example.com/2.jpg',
    },
  ];

  it('renders all places in the carousel', () => {
    render(<PlaceCarousel places={mockPlaces} selectedId={null} onSelect={vi.fn()} />);

    expect(screen.getByText('First Place')).toBeInTheDocument();
    expect(screen.getByText('Second Place')).toBeInTheDocument();
  });

  it('calls onSelect with correct place when a place is clicked', () => {
    const onSelect = vi.fn();
    render(<PlaceCarousel places={mockPlaces} selectedId={null} onSelect={onSelect} />);

    const firstPlace = screen.getByText('First Place');
    fireEvent.click(firstPlace);

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(mockPlaces[0]);
  });

  it('highlights selected place', () => {
    const { rerender } = render(
      <PlaceCarousel places={mockPlaces} selectedId={null} onSelect={vi.fn()} />
    );

    rerender(<PlaceCarousel places={mockPlaces} selectedId="place-1" onSelect={vi.fn()} />);

    const firstPlace = screen.getByText('First Place');
    const card = firstPlace.closest('div[class*="rounded-2xl"]');
    expect(card?.className).toContain('bg-black/5');
  });

  it('renders empty carousel when no places provided', () => {
    render(<PlaceCarousel places={[]} selectedId={null} onSelect={vi.fn()} />);

    expect(screen.queryByText('First Place')).not.toBeInTheDocument();
  });

  it('renders each place card with shadow and ring styles', () => {
    const { container } = render(
      <PlaceCarousel places={mockPlaces} selectedId={null} onSelect={vi.fn()} />
    );

    const cards = container.querySelectorAll('div[class*="shadow-xl"]');
    expect(cards.length).toBe(mockPlaces.length);
  });

  it('renders carousel at bottom of viewport with correct positioning', () => {
    const { container } = render(
      <PlaceCarousel places={mockPlaces} selectedId={null} onSelect={vi.fn()} />
    );

    const carousel = container.firstChild as HTMLElement;
    expect(carousel.className).toContain('absolute');
    expect(carousel.className).toContain('bottom-0');
  });
});
