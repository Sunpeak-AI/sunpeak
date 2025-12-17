import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PlaceInspector } from './place-inspector';
import type { Place } from '../../simulations/map-simulation';

describe('PlaceInspector', () => {
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

  it('renders place details correctly', () => {
    render(<PlaceInspector place={mockPlace} onClose={vi.fn()} />);

    expect(screen.getByText('Test Pizza Place')).toBeInTheDocument();
    expect(screen.getByText('4.5')).toBeInTheDocument();
    expect(screen.getByText('$$', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('San Francisco', { exact: false })).toBeInTheDocument();
  });

  it('renders place thumbnail with correct attributes', () => {
    render(<PlaceInspector place={mockPlace} onClose={vi.fn()} />);

    const image = screen.getByRole('img', { name: 'Test Pizza Place' });
    expect(image).toHaveAttribute('src', 'https://example.com/test.jpg');
    expect(image).toHaveAttribute('alt', 'Test Pizza Place');
    expect(image).toHaveAttribute('loading', 'lazy');
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<PlaceInspector place={mockPlace} onClose={onClose} />);

    const closeButton = screen.getByLabelText('Close details');
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders action buttons', () => {
    render(<PlaceInspector place={mockPlace} onClose={vi.fn()} />);

    expect(screen.getByText('Add to favorites')).toBeInTheDocument();
    expect(screen.getByText('Contact')).toBeInTheDocument();
  });

  it('renders reviews section with multiple reviews', () => {
    render(<PlaceInspector place={mockPlace} onClose={vi.fn()} />);

    expect(screen.getByText('Reviews')).toBeInTheDocument();
    expect(screen.getByText('Leo M.')).toBeInTheDocument();
    expect(screen.getByText('Priya S.')).toBeInTheDocument();
    expect(screen.getByText('Maya R.')).toBeInTheDocument();
  });

  it('renders review content correctly', () => {
    render(<PlaceInspector place={mockPlace} onClose={vi.fn()} />);

    expect(
      screen.getByText('Fantastic crust and balanced toppings. The marinara is spot on!')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Cozy vibe and friendly staff. Quick service on a Friday night.')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Great for sharing. Will definitely come back with friends.')
    ).toBeInTheDocument();
  });

  it('renders extended description', () => {
    render(<PlaceInspector place={mockPlace} onClose={vi.fn()} />);

    expect(
      screen.getByText(/Enjoy a slice at one of SF's favorites/, { exact: false })
    ).toBeInTheDocument();
  });

  it('formats rating to one decimal place', () => {
    const placeWithRating = { ...mockPlace, rating: 4.789 };
    render(<PlaceInspector place={placeWithRating} onClose={vi.fn()} />);

    expect(screen.getByText('4.8')).toBeInTheDocument();
    expect(screen.queryByText('4.789')).not.toBeInTheDocument();
  });
});
