import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MapResource } from './map-resource';

// Mock sunpeak hooks
let mockSafeArea: { insets: { top: number; bottom: number; left: number; right: number } } | null =
  {
    insets: { top: 0, bottom: 0, left: 0, right: 0 },
  };
let mockMaxHeight: number | null = 600;

vi.mock('sunpeak', () => ({
  useSafeArea: () => mockSafeArea,
  useMaxHeight: () => mockMaxHeight,
}));

// Mock the Map component
vi.mock('./components/map', () => ({
  Map: () => <div data-testid="map">Map Component</div>,
}));

describe('MapResource', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSafeArea = { insets: { top: 0, bottom: 0, left: 0, right: 0 } };
    mockMaxHeight = 600;
  });

  it('renders the Map component', () => {
    const { getByTestId } = render(<MapResource />);

    expect(getByTestId('map')).toBeInTheDocument();
  });

  it('respects safe area insets', () => {
    mockSafeArea = { insets: { top: 20, bottom: 30, left: 10, right: 15 } };

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
    mockMaxHeight = 400;

    const { container } = render(<MapResource />);
    const mainDiv = container.firstChild as HTMLElement;

    expect(mainDiv).toHaveStyle({
      maxHeight: '400px',
    });
  });

  it('handles null safe area', () => {
    mockSafeArea = null;

    const { container } = render(<MapResource />);
    const mainDiv = container.firstChild as HTMLElement;

    expect(mainDiv).toHaveStyle({
      paddingTop: '0px',
      paddingBottom: '0px',
      paddingLeft: '0px',
      paddingRight: '0px',
    });
  });

  it('handles null maxHeight', () => {
    mockMaxHeight = null;

    const { container } = render(<MapResource />);
    const mainDiv = container.firstChild as HTMLElement;

    // maxHeight should not be set when null
    expect(mainDiv.style.maxHeight).toBe('');
  });

  it('forwards ref to the container div', () => {
    const ref = vi.fn();
    render(<MapResource ref={ref} />);

    expect(ref).toHaveBeenCalled();
    expect(ref.mock.calls[0][0]).toBeInstanceOf(HTMLDivElement);
  });

  it('has the correct displayName', () => {
    expect(MapResource.displayName).toBe('MapResource');
  });
});
