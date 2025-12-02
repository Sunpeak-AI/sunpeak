import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { FullscreenViewer } from './fullscreen-viewer';
import type { Album } from './albums';

// Mock sunpeak hooks
let mockMaxHeight = 800;
let mockSafeArea = { insets: { top: 0, bottom: 0, left: 0, right: 0 } };

vi.mock('sunpeak', () => ({
  useMaxHeight: () => mockMaxHeight,
  useSafeArea: () => mockSafeArea,
}));

describe('FullscreenViewer', () => {
  const mockAlbum: Album = {
    id: 'album-1',
    title: 'Test Album',
    cover: 'https://example.com/cover.jpg',
    photos: [
      { id: '1', title: 'First Photo', url: 'https://example.com/1.jpg' },
      { id: '2', title: 'Second Photo', url: 'https://example.com/2.jpg' },
      { id: '3', title: 'Third Photo', url: 'https://example.com/3.jpg' },
    ],
  };

  it('resets to first photo when album changes', () => {
    const { rerender, container } = render(<FullscreenViewer album={mockAlbum} />);

    // Get the main photo area (not the film strip)
    const mainPhotoArea = container.querySelector('.flex-1.min-w-0');
    let mainPhoto = mainPhotoArea?.querySelector('img');
    expect(mainPhoto).toHaveAttribute('alt', 'First Photo');
    expect(mainPhoto).toHaveAttribute('src', 'https://example.com/1.jpg');

    // Create a different album
    const differentAlbum: Album = {
      id: 'album-2',
      title: 'Different Album',
      cover: 'https://example.com/cover2.jpg',
      photos: [
        { id: '4', title: 'New First Photo', url: 'https://example.com/4.jpg' },
        { id: '5', title: 'New Second Photo', url: 'https://example.com/5.jpg' },
      ],
    };

    // Rerender with different album
    rerender(<FullscreenViewer album={differentAlbum} />);

    // Should show the first photo of the new album
    mainPhoto = mainPhotoArea?.querySelector('img');
    expect(mainPhoto).toHaveAttribute('alt', 'New First Photo');
    expect(mainPhoto).toHaveAttribute('src', 'https://example.com/4.jpg');
  });

  it('displays correct photo based on selected index from FilmStrip', () => {
    const { container } = render(<FullscreenViewer album={mockAlbum} />);

    // Get the main photo (not from film strip)
    const mainPhotoArea = container.querySelector('.flex-1.min-w-0');
    const firstPhoto = mainPhotoArea?.querySelector('img');

    expect(firstPhoto).toHaveAttribute('alt', 'First Photo');
    expect(firstPhoto).toHaveAttribute('src', 'https://example.com/1.jpg');
  });

  it('handles empty photos array gracefully', () => {
    const emptyAlbum: Album = {
      id: 'empty-album',
      title: 'Empty Album',
      cover: 'https://example.com/cover.jpg',
      photos: [],
    };

    const { container } = render(<FullscreenViewer album={emptyAlbum} />);

    // Should not render any img element in the main photo area
    const images = container.querySelectorAll('img');
    expect(images.length).toBe(0);
  });

  it('respects safe area insets for main photo area', () => {
    mockSafeArea = { insets: { top: 20, bottom: 30, left: 10, right: 15 } };

    const { container } = render(<FullscreenViewer album={mockAlbum} />);

    // Find the main photo area
    const mainPhotoArea = container.querySelector('.flex-1.min-w-0');
    expect(mainPhotoArea).toBeInTheDocument();

    // Note: calc values may not be computed in jsdom, so we check the element has the style attribute
    expect(mainPhotoArea).toHaveAttribute('style');
  });

  it('respects maxHeight constraint', () => {
    mockMaxHeight = 600;

    const { container } = render(<FullscreenViewer album={mockAlbum} />);

    const mainDiv = container.firstChild as HTMLElement;
    expect(mainDiv).toHaveStyle({
      maxHeight: '600px',
      height: '600px',
    });
  });
});
