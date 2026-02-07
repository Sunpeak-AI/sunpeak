import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AlbumsResource } from './albums-resource';

// Mock sunpeak — SafeArea renders as a plain div
vi.mock('sunpeak', () => ({
  useApp: () => null,
  SafeArea: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
    <div data-testid="safe-area" {...props}>
      {children}
    </div>
  ),
}));

// Mock Albums component
vi.mock('./components/albums', () => ({
  Albums: () => <div data-testid="albums-component">Albums Component</div>,
}));

describe('AlbumsResource', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Albums component', () => {
    render(<AlbumsResource />);

    expect(screen.getByTestId('albums-component')).toBeInTheDocument();
    expect(screen.getByText('Albums Component')).toBeInTheDocument();
  });

  it('wraps content in SafeArea', () => {
    render(<AlbumsResource />);

    const safeArea = screen.getByTestId('safe-area');
    expect(safeArea).toBeInTheDocument();
    expect(safeArea).toContainElement(screen.getByTestId('albums-component'));
  });
});
