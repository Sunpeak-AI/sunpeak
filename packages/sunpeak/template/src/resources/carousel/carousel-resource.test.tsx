import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CarouselResource } from './carousel-resource';

// Mock sunpeak hooks
interface Place {
  id: string;
  name: string;
  rating: number;
  category: string;
  location: string;
  image: string;
  description: string;
}

let mockToolOutput: { places: Place[] } = { places: [] };
let mockSafeArea = { top: 0, bottom: 0, left: 0, right: 0 };
let mockViewport: { maxHeight: number } | null = { maxHeight: 600 };
let mockHostContext: {
  deviceCapabilities?: { hover: boolean; touch: boolean };
} | null = {
  deviceCapabilities: { hover: true, touch: false },
};
let mockDisplayMode = 'inline';

vi.mock('sunpeak', () => ({
  useApp: () => ({ app: null, isConnected: true, error: null }),
  useToolData: (_app: unknown, _defaultInput: unknown, defaultOutput: { places: Place[] }) => ({
    output: mockToolOutput.places.length > 0 ? mockToolOutput : defaultOutput,
    input: null,
    inputPartial: null,
    isError: false,
    isLoading: false,
  }),
  useSafeArea: () => mockSafeArea,
  useViewport: () => mockViewport,
  useHostContext: () => mockHostContext,
  useDisplayMode: () => mockDisplayMode,
}));

// Mock child components
vi.mock('./components', () => ({
  Carousel: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="carousel">{children}</div>
  ),
  Card: ({ header, buttonSize }: { header: React.ReactNode; buttonSize?: string }) => (
    <div data-testid="card" data-button-size={buttonSize}>
      {header}
    </div>
  ),
}));

describe('CarouselResource', () => {
  const mockPlaces = [
    {
      id: 'place-1',
      name: 'Beach Resort',
      rating: 4.5,
      category: 'Hotel',
      location: 'Miami',
      image: 'https://example.com/beach.jpg',
      description: 'Beautiful beach resort',
    },
    {
      id: 'place-2',
      name: 'Mountain Lodge',
      rating: 4.8,
      category: 'Lodge',
      location: 'Colorado',
      image: 'https://example.com/mountain.jpg',
      description: 'Cozy mountain lodge',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockToolOutput = { places: [] };
    mockSafeArea = { top: 0, bottom: 0, left: 0, right: 0 };
    mockViewport = { maxHeight: 600 };
    mockHostContext = { deviceCapabilities: { hover: true, touch: false } };
    mockDisplayMode = 'inline';
  });

  it('renders carousel with places', () => {
    mockToolOutput = { places: mockPlaces };

    render(<CarouselResource />);

    expect(screen.getByTestId('carousel')).toBeInTheDocument();
    expect(screen.getByText('Beach Resort')).toBeInTheDocument();
    expect(screen.getByText('Mountain Lodge')).toBeInTheDocument();
  });

  it('renders empty carousel when no places provided', () => {
    mockToolOutput = { places: [] };

    const { container } = render(<CarouselResource />);

    expect(screen.getByTestId('carousel')).toBeInTheDocument();
    expect(container.querySelectorAll('[data-testid="card"]').length).toBe(0);
  });

  it('respects safe area insets', () => {
    mockSafeArea = { top: 20, bottom: 30, left: 10, right: 15 };

    const { container } = render(<CarouselResource />);
    const mainDiv = container.firstChild as HTMLElement;

    expect(mainDiv).toHaveStyle({
      paddingTop: '20px',
      paddingBottom: '30px',
      paddingLeft: '10px',
      paddingRight: '15px',
    });
  });

  it('respects maxHeight constraint', () => {
    mockViewport = { maxHeight: 500 };

    const { container } = render(<CarouselResource />);
    const mainDiv = container.firstChild as HTMLElement;

    expect(mainDiv).toHaveStyle({
      maxHeight: '500px',
    });
  });

  it('passes larger button size for touch devices', () => {
    mockHostContext = { deviceCapabilities: { hover: false, touch: true } };
    mockToolOutput = { places: mockPlaces };

    render(<CarouselResource />);

    const cards = screen.getAllByTestId('card');
    cards.forEach((card) => {
      expect(card).toHaveAttribute('data-button-size', 'md');
    });
  });

  it('passes standard button size for non-touch devices', () => {
    mockHostContext = { deviceCapabilities: { hover: true, touch: false } };
    mockToolOutput = { places: mockPlaces };

    render(<CarouselResource />);

    const cards = screen.getAllByTestId('card');
    cards.forEach((card) => {
      expect(card).toHaveAttribute('data-button-size', 'sm');
    });
  });

  it('renders all place information', () => {
    mockToolOutput = { places: mockPlaces };

    render(<CarouselResource />);

    // Check that place names are rendered
    expect(screen.getByText('Beach Resort')).toBeInTheDocument();
    expect(screen.getByText('Mountain Lodge')).toBeInTheDocument();
  });
});
