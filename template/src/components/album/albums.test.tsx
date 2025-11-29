import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Albums, type AlbumsData } from './albums';

// Mock sunpeak hooks
const mockSetWidgetState = vi.fn();
const mockRequestDisplayMode = vi.fn();
let mockWidgetData: AlbumsData = { albums: [] };

vi.mock('sunpeak', () => ({
  useWidgetProps: () => mockWidgetData,
  useWidgetState: () => [{ selectedAlbumId: null }, mockSetWidgetState],
  useDisplayMode: () => 'default',
  useWidgetAPI: () => ({ requestDisplayMode: mockRequestDisplayMode }),
}));

// Mock child components to simplify testing
vi.mock('./fullscreen-viewer', () => ({
  FullscreenViewer: ({ album }: { album: { title: string } }) => (
    <div data-testid="fullscreen-viewer">{album.title}</div>
  ),
}));

vi.mock('../carousel', () => ({
  Carousel: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="carousel">{children}</div>
  ),
}));

describe('Albums', () => {
  const mockAlbums = [
    {
      id: 'album-1',
      title: 'Summer Vacation',
      cover: 'https://example.com/1.jpg',
      photos: [
        { id: 'p1', title: 'Beach', url: 'https://example.com/p1.jpg' },
      ],
    },
    {
      id: 'album-2',
      title: 'City Trip',
      cover: 'https://example.com/2.jpg',
      photos: [
        { id: 'p2', title: 'Downtown', url: 'https://example.com/p2.jpg' },
      ],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockWidgetData = { albums: mockAlbums };
  });

  it('renders Carousel with all albums in default mode', () => {
    render(<Albums />);

    // Should render carousel
    expect(screen.getByTestId('carousel')).toBeInTheDocument();

    // Should render both album titles
    expect(screen.getByText('Summer Vacation')).toBeInTheDocument();
    expect(screen.getByText('City Trip')).toBeInTheDocument();
  });

  it('calls setWidgetState and requestDisplayMode when album is selected', () => {
    render(<Albums />);

    // Find and click the first album
    const firstAlbum = screen.getByText('Summer Vacation').closest('button')!;
    fireEvent.click(firstAlbum);

    // Should update widget state with selected album ID
    expect(mockSetWidgetState).toHaveBeenCalledWith({ selectedAlbumId: 'album-1' });

    // Should request fullscreen mode
    expect(mockRequestDisplayMode).toHaveBeenCalledWith({ mode: 'fullscreen' });
  });

  it('renders empty carousel when no albums provided', () => {
    mockWidgetData = { albums: [] };

    const { container } = render(<Albums />);

    // Should render carousel (even if empty)
    expect(screen.getByTestId('carousel')).toBeInTheDocument();

    // Should not render any album cards
    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBe(0);
  });
});
