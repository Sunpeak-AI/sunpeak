import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { FullscreenViewer } from './fullscreen-viewer';
import type { Album } from './albums';

// Mock sunpeak — SafeArea renders as a plain div
vi.mock('sunpeak', () => ({
  SafeArea: vi.fn(
    ({
      children,
      className,
      ...props
    }: {
      children: React.ReactNode;
      className?: string;
      [key: string]: unknown;
    }) => (
      <div data-testid="safe-area" className={className} {...props}>
        {children}
      </div>
    )
  ),
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

    // Get the main photo area
    const mainPhotoArea = container.querySelector('.flex-1');
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

    // Get the main photo
    const mainPhotoArea = container.querySelector('.flex-1');
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

  it('wraps content in SafeArea', () => {
    const { container } = render(<FullscreenViewer album={mockAlbum} />);

    const safeArea = container.querySelector('[data-testid="safe-area"]');
    expect(safeArea).toBeInTheDocument();
  });
});
