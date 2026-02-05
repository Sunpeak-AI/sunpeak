import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MapResource } from './map-resource';

// Mock sunpeak hooks
let mockSafeArea = { top: 0, bottom: 0, left: 0, right: 0 };
let mockViewport: { maxHeight: number } | null = { maxHeight: 600 };

vi.mock('sunpeak', () => ({
  useApp: () => ({ app: null, isConnected: true, error: null }),
  useSafeArea: () => mockSafeArea,
  useViewport: () => mockViewport,
}));

// Mock the Map component
vi.mock('./components/map', () => ({
  Map: () => <div data-testid="map">Map Component</div>,
}));

describe('MapResource', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSafeArea = { top: 0, bottom: 0, left: 0, right: 0 };
    mockViewport = { maxHeight: 600 };
  });

  it('renders the Map component', () => {
    const { getByTestId } = render(<MapResource />);

    expect(getByTestId('map')).toBeInTheDocument();
  });

  it('respects safe area insets', () => {
    mockSafeArea = { top: 20, bottom: 30, left: 10, right: 15 };

    const { container } = render(<MapResource />);
    const mainDiv = container.firstChild as HTMLElement;

    expect(mainDiv).toHaveStyle({
      paddingTop: '20px',
      paddingBottom: '30px',
      paddingLeft: '10px',
      paddingRight: '15px',
    });
  });

  it('respects maxHeight constraint', () => {
    mockViewport = { maxHeight: 400 };

    const { container } = render(<MapResource />);
    const mainDiv = container.firstChild as HTMLElement;

    expect(mainDiv).toHaveStyle({
      maxHeight: '400px',
    });
  });

  it('handles zero safe area insets', () => {
    mockSafeArea = { top: 0, bottom: 0, left: 0, right: 0 };

    const { container } = render(<MapResource />);
    const mainDiv = container.firstChild as HTMLElement;

    expect(mainDiv).toHaveStyle({
      paddingTop: '0px',
      paddingBottom: '0px',
      paddingLeft: '0px',
      paddingRight: '0px',
    });
  });

  it('handles null viewport', () => {
    mockViewport = null;

    const { container } = render(<MapResource />);
    const mainDiv = container.firstChild as HTMLElement;

    // maxHeight should not be set when null
    expect(mainDiv.style.maxHeight).toBe('');
  });
});
