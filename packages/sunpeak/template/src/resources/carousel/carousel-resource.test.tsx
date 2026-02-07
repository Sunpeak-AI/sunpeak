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
let mockHostContext: {
  deviceCapabilities?: { hover: boolean; touch: boolean };
} | null = {
  deviceCapabilities: { hover: true, touch: false },
};
let mockDisplayMode = 'inline';

vi.mock('sunpeak', () => ({
  useApp: () => null,
  useToolData: (_defaultInput: unknown, defaultOutput: { places: Place[] }) => ({
    output: mockToolOutput.places.length > 0 ? mockToolOutput : defaultOutput,
    input: null,
    inputPartial: null,
    isError: false,
    isLoading: false,
    isCancelled: false,
    cancelReason: null,
  }),
  useHostContext: () => mockHostContext,
  useDisplayMode: () => mockDisplayMode,
  SafeArea: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
    <div data-testid="safe-area" {...props}>
      {children}
    </div>
  ),
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

  it('wraps content in SafeArea', () => {
    render(<CarouselResource />);

    const safeArea = screen.getByTestId('safe-area');
    expect(safeArea).toBeInTheDocument();
    expect(safeArea).toContainElement(screen.getByTestId('carousel'));
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
