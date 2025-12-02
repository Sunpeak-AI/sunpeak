import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Albums, type AlbumsData } from './albums';

// Mock sunpeak hooks
const mockSetWidgetState = vi.fn();
const mockRequestDisplayMode = vi.fn();
let mockWidgetData: AlbumsData = { albums: [] };
let mockUserAgent: {
  device: { type: 'desktop' | 'mobile' | 'tablet' | 'unknown' };
  capabilities: { hover: boolean; touch: boolean };
} = {
  device: { type: 'desktop' },
  capabilities: { hover: true, touch: false },
};

vi.mock('sunpeak', () => ({
  useWidgetProps: () => mockWidgetData,
  useWidgetState: () => [{ selectedAlbumId: null }, mockSetWidgetState],
  useDisplayMode: () => 'default',
  useWidgetAPI: () => ({ requestDisplayMode: mockRequestDisplayMode }),
  useUserAgent: () => mockUserAgent,
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

vi.mock('./album-card', () => ({
  AlbumCard: ({
    album,
    onSelect,
    buttonSize,
  }: {
    album: { title: string };
    onSelect: (a: unknown) => void;
    buttonSize?: string;
  }) => (
    <button onClick={() => onSelect(album)} data-button-size={buttonSize}>
      {album.title}
    </button>
  ),
}));

describe('Albums', () => {
  const mockAlbums = [
    {
      id: 'album-1',
      title: 'Summer Vacation',
      cover: 'https://example.com/1.jpg',
      photos: [{ id: 'p1', title: 'Beach', url: 'https://example.com/p1.jpg' }],
    },
    {
      id: 'album-2',
      title: 'City Trip',
      cover: 'https://example.com/2.jpg',
      photos: [{ id: 'p2', title: 'Downtown', url: 'https://example.com/p2.jpg' }],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockWidgetData = { albums: mockAlbums };
    mockUserAgent = { device: { type: 'desktop' }, capabilities: { hover: true, touch: false } };
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

  it('passes larger button size for touch devices', () => {
    mockUserAgent = { device: { type: 'mobile' }, capabilities: { hover: false, touch: true } };

    render(<Albums />);

    const albumButtons = screen.getAllByRole('button');
    albumButtons.forEach((button) => {
      expect(button).toHaveAttribute('data-button-size', 'lg');
    });
  });

  it('passes standard button size for non-touch devices', () => {
    mockUserAgent = { device: { type: 'desktop' }, capabilities: { hover: true, touch: false } };

    render(<Albums />);

    const albumButtons = screen.getAllByRole('button');
    albumButtons.forEach((button) => {
      expect(button).toHaveAttribute('data-button-size', 'md');
    });
  });
});
