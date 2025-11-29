import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { FilmStrip } from './film-strip';
import type { Album } from './albums';

describe('FilmStrip', () => {
  const mockAlbum: Album = {
    id: 'test-album',
    title: 'Test Album',
    cover: 'https://example.com/cover.jpg',
    photos: [
      { id: '1', title: 'Sunset', url: 'https://example.com/1.jpg' },
      { id: '2', title: '', url: 'https://example.com/2.jpg' },
      { id: '3', title: 'Mountains', url: 'https://example.com/3.jpg' },
    ],
  };

  it('applies correct styling to selected photo', () => {
    const { container } = render(
      <FilmStrip album={mockAlbum} selectedIndex={1} />
    );

    const buttons = container.querySelectorAll('button');

    // Selected photo (index 1) should have border-primary
    expect(buttons[1].className).toContain('border-primary');
    expect(buttons[1].className).toContain('shadow-md');

    // Non-selected photos should have border-transparent
    expect(buttons[0].className).toContain('border-transparent');
    expect(buttons[0].className).toContain('opacity-60');
    expect(buttons[2].className).toContain('border-transparent');
  });

  it('calls onSelect with correct index when photo is clicked', () => {
    const onSelect = vi.fn();
    render(<FilmStrip album={mockAlbum} selectedIndex={0} onSelect={onSelect} />);

    const images = screen.getAllByRole('img');

    // Click on the second photo (index 1)
    fireEvent.click(images[1].closest('button')!);
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(1);

    // Click on the third photo (index 2)
    fireEvent.click(images[2].closest('button')!);
    expect(onSelect).toHaveBeenCalledTimes(2);
    expect(onSelect).toHaveBeenCalledWith(2);
  });

  it('renders alt text with fallback for photos without titles', () => {
    render(<FilmStrip album={mockAlbum} selectedIndex={0} />);

    const images = screen.getAllByRole('img');

    // Photo with title
    expect(images[0]).toHaveAttribute('alt', 'Sunset');

    // Photo without title should fall back to "Photo N"
    expect(images[1]).toHaveAttribute('alt', 'Photo 2');

    // Photo with title
    expect(images[2]).toHaveAttribute('alt', 'Mountains');
  });
});
