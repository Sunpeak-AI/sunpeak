import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AlbumsResource } from './albums-resource';

// Mock sunpeak hooks
let mockSafeArea = { top: 0, bottom: 0, left: 0, right: 0 };
let mockViewport: { maxHeight: number } | null = { maxHeight: 600 };

vi.mock('sunpeak', () => ({
  useApp: () => ({ app: null, isConnected: true, error: null }),
  useSafeArea: () => mockSafeArea,
  useViewport: () => mockViewport,
}));

// Mock Albums component
vi.mock('./components/albums', () => ({
  Albums: () => <div data-testid="albums-component">Albums Component</div>,
}));

describe('AlbumsResource', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSafeArea = { top: 0, bottom: 0, left: 0, right: 0 };
    mockViewport = { maxHeight: 600 };
  });

  it('renders Albums component', () => {
    render(<AlbumsResource />);

    expect(screen.getByTestId('albums-component')).toBeInTheDocument();
    expect(screen.getByText('Albums Component')).toBeInTheDocument();
  });

  it('respects safe area insets', () => {
    mockSafeArea = { top: 20, bottom: 30, left: 10, right: 15 };

    const { container } = render(<AlbumsResource />);
    const mainDiv = container.firstChild as HTMLElement;

    expect(mainDiv).toHaveStyle({
      paddingTop: '20px',
      paddingBottom: '30px',
      paddingLeft: '10px',
      paddingRight: '15px',
    });
  });

  it('respects maxHeight constraint', () => {
    mockViewport = { maxHeight: 800 };

    const { container } = render(<AlbumsResource />);
    const mainDiv = container.firstChild as HTMLElement;

    expect(mainDiv).toHaveStyle({
      maxHeight: '800px',
    });
  });

  it('applies zero safe area insets when not provided', () => {
    mockSafeArea = { top: 0, bottom: 0, left: 0, right: 0 };

    const { container } = render(<AlbumsResource />);
    const mainDiv = container.firstChild as HTMLElement;

    expect(mainDiv).toHaveStyle({
      paddingTop: '0px',
      paddingBottom: '0px',
      paddingLeft: '0px',
      paddingRight: '0px',
    });
  });

  it('handles null viewport gracefully', () => {
    mockViewport = null;

    const { container } = render(<AlbumsResource />);
    const mainDiv = container.firstChild as HTMLElement;

    // maxHeight should not be set when viewport is null
    expect(mainDiv.style.maxHeight).toBe('');
  });
});
