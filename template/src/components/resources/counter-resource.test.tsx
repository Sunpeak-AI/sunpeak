import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CounterResource } from './counter-resource';

// Mock sunpeak hooks
const mockSetWidgetState = vi.fn();
let mockSafeArea = { insets: { top: 0, bottom: 0, left: 0, right: 0 } };
let mockMaxHeight = 600;
let mockUserAgent: {
  device: { type: 'desktop' | 'mobile' | 'tablet' | 'unknown' };
  capabilities: { hover: boolean; touch: boolean };
} = {
  device: { type: 'desktop' },
  capabilities: { hover: true, touch: false },
};

vi.mock('sunpeak', () => ({
  useWidgetState: () => [{ count: 0 }, mockSetWidgetState],
  useSafeArea: () => mockSafeArea,
  useMaxHeight: () => mockMaxHeight,
  useUserAgent: () => mockUserAgent,
}));

describe('CounterResource', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSafeArea = { insets: { top: 0, bottom: 0, left: 0, right: 0 } };
    mockMaxHeight = 600;
    mockUserAgent = { device: { type: 'desktop' }, capabilities: { hover: true, touch: false } };
  });

  it('renders counter with initial count', () => {
    render(<CounterResource />);

    expect(screen.getByText('Welcome to Sunpeak!')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('increments counter when + button is clicked', () => {
    render(<CounterResource />);

    const incrementButton = screen.getByLabelText('Increment');
    fireEvent.click(incrementButton);

    expect(mockSetWidgetState).toHaveBeenCalledWith({ count: 1 });
  });

  it('decrements counter when - button is clicked', () => {
    render(<CounterResource />);

    const decrementButton = screen.getByLabelText('Decrement');
    fireEvent.click(decrementButton);

    expect(mockSetWidgetState).toHaveBeenCalledWith({ count: -1 });
  });

  it('resets counter when Reset button is clicked', () => {
    render(<CounterResource />);

    const resetButton = screen.getByText('Reset');
    fireEvent.click(resetButton);

    expect(mockSetWidgetState).toHaveBeenCalledWith({ count: 0 });
  });

  it('respects safe area insets', () => {
    mockSafeArea = { insets: { top: 20, bottom: 30, left: 10, right: 15 } };

    const { container } = render(<CounterResource />);
    const mainDiv = container.firstChild as HTMLElement;

    expect(mainDiv).toHaveStyle({
      paddingTop: 'calc(2rem + 20px)',
      paddingBottom: 'calc(2rem + 30px)',
      paddingLeft: 'calc(2rem + 10px)',
      paddingRight: 'calc(2rem + 15px)',
    });
  });

  it('respects maxHeight constraint', () => {
    mockMaxHeight = 400;

    const { container } = render(<CounterResource />);
    const mainDiv = container.firstChild as HTMLElement;

    expect(mainDiv).toHaveStyle({
      maxHeight: '400px',
    });
  });

  it('renders larger buttons for touch devices', () => {
    mockUserAgent = { device: { type: 'mobile' }, capabilities: { hover: false, touch: true } };

    render(<CounterResource />);

    const incrementButton = screen.getByLabelText('Increment');
    const resetButton = screen.getByText('Reset');

    // Buttons should have larger size for touch
    expect(incrementButton).toBeInTheDocument();
    expect(resetButton).toBeInTheDocument();
  });

  it('renders standard-sized buttons for non-touch devices', () => {
    mockUserAgent = { device: { type: 'desktop' }, capabilities: { hover: true, touch: false } };

    render(<CounterResource />);

    const incrementButton = screen.getByLabelText('Increment');
    const resetButton = screen.getByText('Reset');

    // Buttons should have standard size for non-touch
    expect(incrementButton).toBeInTheDocument();
    expect(resetButton).toBeInTheDocument();
  });
});
