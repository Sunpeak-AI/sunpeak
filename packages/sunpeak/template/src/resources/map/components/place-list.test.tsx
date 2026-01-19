import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PlaceList } from './place-list';
import type { Place } from './types';

describe('PlaceList', () => {
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
    {
      id: 'place-3',
      name: 'Third Place',
      coords: [-122.4294, 37.7649],
      description: 'Third test place',
      city: 'Berkeley',
      rating: 4.8,
      price: '$$$',
      thumbnail: 'https://example.com/3.jpg',
    },
  ];

  it('renders all places in the list', () => {
    render(<PlaceList places={mockPlaces} selectedId={null} onSelect={vi.fn()} />);

    expect(screen.getByText('First Place')).toBeInTheDocument();
    expect(screen.getByText('Second Place')).toBeInTheDocument();
    expect(screen.getByText('Third Place')).toBeInTheDocument();
  });

  it('displays correct number of results in header', () => {
    render(<PlaceList places={mockPlaces} selectedId={null} onSelect={vi.fn()} />);

    expect(screen.getByText('3 results')).toBeInTheDocument();
  });

  it('calls onSelect with correct place when a place is clicked', () => {
    const onSelect = vi.fn();
    render(<PlaceList places={mockPlaces} selectedId={null} onSelect={onSelect} />);

    const firstPlace = screen.getByText('First Place');
    fireEvent.click(firstPlace);

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(mockPlaces[0]);
  });

  it('highlights selected place', () => {
    const { rerender } = render(
      <PlaceList places={mockPlaces} selectedId={null} onSelect={vi.fn()} />
    );

    rerender(<PlaceList places={mockPlaces} selectedId="place-2" onSelect={vi.fn()} />);

    const secondPlace = screen.getByText('Second Place');
    const card = secondPlace.closest('div[class*="rounded-2xl"]');
    expect(card?.className).toContain('bg-black/5');
  });

  it('renders empty list when no places provided', () => {
    render(<PlaceList places={[]} selectedId={null} onSelect={vi.fn()} />);

    expect(screen.getByText('0 results')).toBeInTheDocument();
    expect(screen.queryByText('First Place')).not.toBeInTheDocument();
  });

  it('maintains selection when places update', () => {
    const onSelect = vi.fn();
    const { rerender } = render(
      <PlaceList places={mockPlaces} selectedId="place-2" onSelect={onSelect} />
    );

    const updatedPlaces = [...mockPlaces].reverse();
    rerender(<PlaceList places={updatedPlaces} selectedId="place-2" onSelect={onSelect} />);

    const secondPlace = screen.getByText('Second Place');
    const card = secondPlace.closest('div[class*="rounded-2xl"]');
    expect(card?.className).toContain('bg-black/5');
  });
});
