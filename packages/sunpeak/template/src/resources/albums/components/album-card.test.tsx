import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AlbumCard } from './album-card';
import type { Album } from './albums';

describe('AlbumCard', () => {
  const mockAlbum: Album = {
    id: 'test-album',
    title: 'Test Album',
    cover: 'https://example.com/cover.jpg',
    photos: [
      { id: '1', title: 'Photo 1', url: 'https://example.com/1.jpg' },
      { id: '2', title: 'Photo 2', url: 'https://example.com/2.jpg' },
    ],
  };

  it('correctly pluralizes photo count', () => {
    // Test plural (2 photos)
    const { rerender } = render(<AlbumCard album={mockAlbum} />);
    expect(screen.getByText('2 photos')).toBeInTheDocument();

    // Test singular (1 photo)
    const singlePhotoAlbum: Album = {
      ...mockAlbum,
      photos: [{ id: '1', title: 'Photo 1', url: 'https://example.com/1.jpg' }],
    };
    rerender(<AlbumCard album={singlePhotoAlbum} />);
    expect(screen.getByText('1 photo')).toBeInTheDocument();

    // Test zero photos
    const emptyAlbum: Album = {
      ...mockAlbum,
      photos: [],
    };
    rerender(<AlbumCard album={emptyAlbum} />);
    expect(screen.getByText('0 photos')).toBeInTheDocument();
  });

  it('calls onSelect with correct album when clicked', () => {
    const onSelect = vi.fn();
    render(<AlbumCard album={mockAlbum} onSelect={onSelect} />);

    const card = screen.getByRole('button');
    fireEvent.click(card);

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(mockAlbum);
  });

  it('renders album title and cover image with correct attributes', () => {
    render(<AlbumCard album={mockAlbum} />);

    // Check title is displayed
    expect(screen.getByText('Test Album')).toBeInTheDocument();

    // Check image has correct src and alt
    const image = screen.getByRole('img');
    expect(image).toHaveAttribute('src', 'https://example.com/cover.jpg');
    expect(image).toHaveAttribute('alt', 'Test Album');
    expect(image).toHaveAttribute('loading', 'lazy');
  });
});
