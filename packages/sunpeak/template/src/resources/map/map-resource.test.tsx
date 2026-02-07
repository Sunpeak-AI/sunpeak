import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MapResource } from './map-resource';

// Mock sunpeak — SafeArea renders as a plain div
vi.mock('sunpeak', () => ({
  useApp: () => null,
  SafeArea: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
    <div data-testid="safe-area" {...props}>
      {children}
    </div>
  ),
}));

// Mock the Map component
vi.mock('./components/map', () => ({
  Map: () => <div data-testid="map">Map Component</div>,
}));

describe('MapResource', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the Map component', () => {
    const { getByTestId } = render(<MapResource />);

    expect(getByTestId('map')).toBeInTheDocument();
  });

  it('wraps content in SafeArea', () => {
    render(<MapResource />);

    const safeArea = screen.getByTestId('safe-area');
    expect(safeArea).toBeInTheDocument();
    expect(safeArea).toContainElement(screen.getByTestId('map'));
  });
});
