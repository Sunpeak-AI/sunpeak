import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CarouselResource } from './carousel';

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
let mockDeviceCapabilities: { hover?: boolean; touch?: boolean } = { hover: true, touch: false };
let mockDisplayMode = 'inline';

const mockRequestDisplayMode = vi.fn();

vi.mock('sunpeak', () => ({
  useToolData: () => ({
    output: mockToolOutput,
    input: null,
    inputPartial: null,
    isError: false,
    isLoading: false,
    isCancelled: false,
    cancelReason: null,
  }),
  useDeviceCapabilities: () => mockDeviceCapabilities,
  useDisplayMode: () => mockDisplayMode,
  useRequestDisplayMode: () => ({ requestDisplayMode: mockRequestDisplayMode }),
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
  Card: ({
    header,
    buttonSize,
    onClick,
  }: {
    header: React.ReactNode;
    buttonSize?: string;
    onClick?: () => void;
  }) => (
    <div data-testid="card" data-button-size={buttonSize} onClick={onClick}>
      {header}
    </div>
  ),
  PlaceDetail: ({ place }: { place: { name: string } }) => (
    <div data-testid="place-detail">{place.name}</div>
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
    mockDeviceCapabilities = { hover: true, touch: false };
    mockDisplayMode = 'inline';
  });

  it('renders carousel with places', () => {
    mockToolOutput = { places: mockPlaces };

    render(<CarouselResource />);

    expect(screen.getByTestId('carousel')).toBeInTheDocument();
    expect(screen.getByText('Beach Resort')).toBeInTheDocument();
    expect(screen.getByText('Mountain Lodge')).toBeInTheDocument();
  });

  it('shows empty state when no places provided', () => {
    mockToolOutput = { places: [] };

    render(<CarouselResource />);

    expect(screen.getByText('No places found')).toBeInTheDocument();
  });

  it('wraps content in SafeArea', () => {
    mockToolOutput = { places: mockPlaces };

    render(<CarouselResource />);

    const safeArea = screen.getByTestId('safe-area');
    expect(safeArea).toBeInTheDocument();
    expect(safeArea).toContainElement(screen.getByTestId('carousel'));
  });

  it('passes larger button size for touch devices', () => {
    mockDeviceCapabilities = { hover: false, touch: true };
    mockToolOutput = { places: mockPlaces };

    render(<CarouselResource />);

    const cards = screen.getAllByTestId('card');
    cards.forEach((card) => {
      expect(card).toHaveAttribute('data-button-size', 'md');
    });
  });

  it('passes standard button size for non-touch devices', () => {
    mockDeviceCapabilities = { hover: true, touch: false };
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
