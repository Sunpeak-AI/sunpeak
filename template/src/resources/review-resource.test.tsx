import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReviewResource } from './review-resource';

// Mock sunpeak hooks
const mockSetWidgetState = vi.fn();
const mockRequestDisplayMode = vi.fn();

let mockWidgetData: Record<string, unknown> = { title: 'Test Review' };
let mockWidgetState: Record<string, unknown> = { decision: null, decidedAt: null };
let mockSafeArea: { insets: { top: number; bottom: number; left: number; right: number } } | null =
  {
    insets: { top: 0, bottom: 0, left: 0, right: 0 },
  };
let mockMaxHeight: number | null = 600;
let mockUserAgent: {
  device: { type: 'desktop' | 'mobile' | 'tablet' | 'unknown' };
  capabilities: { hover: boolean; touch: boolean };
} | null = {
  device: { type: 'desktop' },
  capabilities: { hover: true, touch: false },
};
let mockDisplayMode: 'inline' | 'fullscreen' = 'inline';

vi.mock('sunpeak', () => ({
  useWidgetProps: (defaultFn: () => Record<string, unknown>) => {
    const defaults = defaultFn();
    return { ...defaults, ...mockWidgetData };
  },
  useWidgetState: () => [mockWidgetState, mockSetWidgetState],
  useSafeArea: () => mockSafeArea,
  useMaxHeight: () => mockMaxHeight,
  useUserAgent: () => mockUserAgent,
  useDisplayMode: () => mockDisplayMode,
  useWidgetAPI: () => ({ requestDisplayMode: mockRequestDisplayMode }),
}));

// Mock Button component
vi.mock('@openai/apps-sdk-ui/components/Button', () => ({
  Button: ({
    children,
    onClick,
    variant,
    color,
    size,
    className,
    'aria-label': ariaLabel,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: string;
    color?: string;
    size?: string;
    className?: string;
    'aria-label'?: string;
  }) => (
    <button
      onClick={onClick}
      data-variant={variant}
      data-color={color}
      data-size={size}
      className={className}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  ),
}));

// Mock Icon component
vi.mock('@openai/apps-sdk-ui/components/Icon', () => ({
  ExpandLg: ({ className }: { className?: string }) => (
    <span data-testid="expand-icon" className={className}>
      Expand
    </span>
  ),
}));

describe('ReviewResource', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWidgetData = { title: 'Test Review' };
    mockWidgetState = { decision: null, decidedAt: null };
    mockSafeArea = { insets: { top: 0, bottom: 0, left: 0, right: 0 } };
    mockMaxHeight = 600;
    mockUserAgent = { device: { type: 'desktop' }, capabilities: { hover: true, touch: false } };
    mockDisplayMode = 'inline';
  });

  describe('Basic Rendering', () => {
    it('renders with title', () => {
      mockWidgetData = { title: 'Confirm Purchase' };

      render(<ReviewResource />);

      expect(screen.getByText('Confirm Purchase')).toBeInTheDocument();
    });

    it('renders with description', () => {
      mockWidgetData = {
        title: 'Test',
        description: 'Please review the following items',
      };

      render(<ReviewResource />);

      expect(screen.getByText('Please review the following items')).toBeInTheDocument();
    });

    it('renders empty state when no sections', () => {
      mockWidgetData = { title: 'Test', sections: [] };

      render(<ReviewResource />);

      expect(screen.getByText('Nothing to confirm')).toBeInTheDocument();
    });

    it('has the correct displayName', () => {
      expect(ReviewResource.displayName).toBe('ReviewResource');
    });
  });

  describe('Action Buttons', () => {
    it('renders default button labels', () => {
      render(<ReviewResource />);

      expect(screen.getByText('Confirm')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('renders custom button labels', () => {
      mockWidgetData = {
        title: 'Test',
        acceptLabel: 'Approve',
        rejectLabel: 'Decline',
      };

      render(<ReviewResource />);

      expect(screen.getByText('Approve')).toBeInTheDocument();
      expect(screen.getByText('Decline')).toBeInTheDocument();
    });

    it('calls setWidgetState with accepted decision when accept clicked', () => {
      render(<ReviewResource />);

      const acceptButton = screen.getByText('Confirm');
      fireEvent.click(acceptButton);

      expect(mockSetWidgetState).toHaveBeenCalledWith(
        expect.objectContaining({
          decision: 'accepted',
          decidedAt: expect.any(String),
        })
      );
    });

    it('calls setWidgetState with rejected decision when reject clicked', () => {
      render(<ReviewResource />);

      const rejectButton = screen.getByText('Cancel');
      fireEvent.click(rejectButton);

      expect(mockSetWidgetState).toHaveBeenCalledWith(
        expect.objectContaining({
          decision: 'rejected',
          decidedAt: expect.any(String),
        })
      );
    });

    it('renders danger styling for accept button when acceptDanger is true', () => {
      mockWidgetData = { title: 'Test', acceptDanger: true };

      render(<ReviewResource />);

      const acceptButton = screen.getByText('Confirm');
      expect(acceptButton).toHaveAttribute('data-color', 'danger');
    });

    it('renders primary styling for accept button by default', () => {
      render(<ReviewResource />);

      const acceptButton = screen.getByText('Confirm');
      expect(acceptButton).toHaveAttribute('data-color', 'primary');
    });
  });

  describe('Decision State', () => {
    it('shows accepted message after accepting', () => {
      mockWidgetState = { decision: 'accepted', decidedAt: '2024-01-01T00:00:00.000Z' };

      render(<ReviewResource />);

      expect(screen.getByText('Confirmed')).toBeInTheDocument();
      expect(screen.queryByText('Confirm')).not.toBeInTheDocument();
    });

    it('shows rejected message after rejecting', () => {
      mockWidgetState = { decision: 'rejected', decidedAt: '2024-01-01T00:00:00.000Z' };

      render(<ReviewResource />);

      expect(screen.getByText('Cancelled')).toBeInTheDocument();
      expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
    });

    it('shows custom accepted message', () => {
      mockWidgetData = { title: 'Test', acceptedMessage: 'Order Placed!' };
      mockWidgetState = { decision: 'accepted', decidedAt: '2024-01-01T00:00:00.000Z' };

      render(<ReviewResource />);

      expect(screen.getByText('Order Placed!')).toBeInTheDocument();
    });

    it('shows custom rejected message', () => {
      mockWidgetData = { title: 'Test', rejectedMessage: 'Order Cancelled' };
      mockWidgetState = { decision: 'rejected', decidedAt: '2024-01-01T00:00:00.000Z' };

      render(<ReviewResource />);

      expect(screen.getByText('Order Cancelled')).toBeInTheDocument();
    });

    it('shows decidedAt timestamp', () => {
      mockWidgetState = { decision: 'accepted', decidedAt: '2024-01-15T10:30:00.000Z' };

      render(<ReviewResource />);

      // The timestamp should be displayed
      const timestampElement = screen.getByText(/2024/);
      expect(timestampElement).toBeInTheDocument();
    });
  });

  describe('Sections', () => {
    it('renders details section', () => {
      mockWidgetData = {
        title: 'Test',
        sections: [
          {
            title: 'Order Details',
            type: 'details',
            content: [
              { label: 'Item', value: 'Widget' },
              { label: 'Price', value: '$10.00' },
            ],
          },
        ],
      };

      render(<ReviewResource />);

      expect(screen.getByText('Order Details')).toBeInTheDocument();
      expect(screen.getByText('Item')).toBeInTheDocument();
      expect(screen.getByText('Widget')).toBeInTheDocument();
      expect(screen.getByText('Price')).toBeInTheDocument();
      expect(screen.getByText('$10.00')).toBeInTheDocument();
    });

    it('renders items section', () => {
      mockWidgetData = {
        title: 'Test',
        sections: [
          {
            title: 'Cart Items',
            type: 'items',
            content: [
              { id: '1', title: 'Product A', subtitle: 'Small', value: '$5.00' },
              { id: '2', title: 'Product B', badge: 'Sale', value: '$15.00' },
            ],
          },
        ],
      };

      render(<ReviewResource />);

      expect(screen.getByText('Cart Items')).toBeInTheDocument();
      expect(screen.getByText('Product A')).toBeInTheDocument();
      expect(screen.getByText('Small')).toBeInTheDocument();
      expect(screen.getByText('Product B')).toBeInTheDocument();
      expect(screen.getByText('Sale')).toBeInTheDocument();
    });

    it('renders changes section', () => {
      mockWidgetData = {
        title: 'Test',
        sections: [
          {
            title: 'File Changes',
            type: 'changes',
            content: [
              { id: '1', type: 'create', path: 'src/new.ts', description: 'New file' },
              { id: '2', type: 'modify', path: 'src/old.ts', description: 'Updated imports' },
              { id: '3', type: 'delete', path: 'src/deprecated.ts', description: 'Removed' },
            ],
          },
        ],
      };

      render(<ReviewResource />);

      expect(screen.getByText('File Changes')).toBeInTheDocument();
      expect(screen.getByText('src/new.ts')).toBeInTheDocument();
      expect(screen.getByText('New file')).toBeInTheDocument();
      expect(screen.getByText('src/old.ts')).toBeInTheDocument();
      expect(screen.getByText('Updated imports')).toBeInTheDocument();
    });

    it('renders preview section', () => {
      mockWidgetData = {
        title: 'Test',
        sections: [
          {
            title: 'Preview',
            type: 'preview',
            content: 'This is the preview content that will be displayed.',
          },
        ],
      };

      render(<ReviewResource />);

      expect(screen.getByText('Preview')).toBeInTheDocument();
      expect(
        screen.getByText('This is the preview content that will be displayed.')
      ).toBeInTheDocument();
    });

    it('renders summary section', () => {
      mockWidgetData = {
        title: 'Test',
        sections: [
          {
            type: 'summary',
            content: [
              { label: 'Subtotal', value: '$20.00' },
              { label: 'Total', value: '$25.00', emphasis: true },
            ],
          },
        ],
      };

      render(<ReviewResource />);

      expect(screen.getByText('Subtotal')).toBeInTheDocument();
      expect(screen.getByText('$20.00')).toBeInTheDocument();
      expect(screen.getByText('Total')).toBeInTheDocument();
      expect(screen.getByText('$25.00')).toBeInTheDocument();
    });
  });

  describe('Alerts', () => {
    it('renders info alert', () => {
      mockWidgetData = {
        title: 'Test',
        alerts: [{ type: 'info', message: 'This is informational' }],
      };

      render(<ReviewResource />);

      expect(screen.getByText('This is informational')).toBeInTheDocument();
    });

    it('renders warning alert', () => {
      mockWidgetData = {
        title: 'Test',
        alerts: [{ type: 'warning', message: 'Please review carefully' }],
      };

      render(<ReviewResource />);

      expect(screen.getByText('Please review carefully')).toBeInTheDocument();
    });

    it('renders error alert', () => {
      mockWidgetData = {
        title: 'Test',
        alerts: [{ type: 'error', message: 'Something went wrong' }],
      };

      render(<ReviewResource />);

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('renders success alert', () => {
      mockWidgetData = {
        title: 'Test',
        alerts: [{ type: 'success', message: 'All checks passed' }],
      };

      render(<ReviewResource />);

      expect(screen.getByText('All checks passed')).toBeInTheDocument();
    });

    it('renders multiple alerts', () => {
      mockWidgetData = {
        title: 'Test',
        alerts: [
          { type: 'warning', message: 'Warning message' },
          { type: 'info', message: 'Info message' },
        ],
      };

      render(<ReviewResource />);

      expect(screen.getByText('Warning message')).toBeInTheDocument();
      expect(screen.getByText('Info message')).toBeInTheDocument();
    });
  });

  describe('Safe Area and Layout', () => {
    it('respects safe area insets', () => {
      mockSafeArea = { insets: { top: 20, bottom: 30, left: 10, right: 15 } };

      const { container } = render(<ReviewResource />);
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

      const { container } = render(<ReviewResource />);
      const mainDiv = container.firstChild as HTMLElement;

      expect(mainDiv).toHaveStyle({
        maxHeight: '400px',
      });
    });

    it('handles null safe area', () => {
      mockSafeArea = null;

      const { container } = render(<ReviewResource />);
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

      const { container } = render(<ReviewResource />);
      const mainDiv = container.firstChild as HTMLElement;

      expect(mainDiv.style.maxHeight).toBe('');
    });
  });

  describe('Touch Device Support', () => {
    it('renders larger buttons for touch devices', () => {
      mockUserAgent = { device: { type: 'mobile' }, capabilities: { hover: false, touch: true } };

      render(<ReviewResource />);

      const acceptButton = screen.getByText('Confirm');
      const rejectButton = screen.getByText('Cancel');

      expect(acceptButton).toHaveAttribute('data-size', 'lg');
      expect(rejectButton).toHaveAttribute('data-size', 'lg');
    });

    it('renders standard buttons for non-touch devices', () => {
      mockUserAgent = { device: { type: 'desktop' }, capabilities: { hover: true, touch: false } };

      render(<ReviewResource />);

      const acceptButton = screen.getByText('Confirm');
      const rejectButton = screen.getByText('Cancel');

      expect(acceptButton).toHaveAttribute('data-size', 'md');
      expect(rejectButton).toHaveAttribute('data-size', 'md');
    });

    it('handles null userAgent gracefully', () => {
      mockUserAgent = null;

      render(<ReviewResource />);

      const acceptButton = screen.getByText('Confirm');
      expect(acceptButton).toHaveAttribute('data-size', 'md');
    });
  });

  describe('Fullscreen Mode', () => {
    it('shows expand button when not in fullscreen mode', () => {
      mockDisplayMode = 'inline';

      render(<ReviewResource />);

      expect(screen.getByTestId('expand-icon')).toBeInTheDocument();
    });

    it('hides expand button when in fullscreen mode', () => {
      mockDisplayMode = 'fullscreen';

      render(<ReviewResource />);

      expect(screen.queryByTestId('expand-icon')).not.toBeInTheDocument();
    });

    it('calls requestDisplayMode when expand button clicked', () => {
      mockDisplayMode = 'inline';

      render(<ReviewResource />);

      const expandButton = screen.getByLabelText('Enter fullscreen');
      fireEvent.click(expandButton);

      expect(mockRequestDisplayMode).toHaveBeenCalledWith({ mode: 'fullscreen' });
    });
  });

  describe('Ref Forwarding', () => {
    it('forwards ref to the container div', () => {
      const ref = vi.fn();
      render(<ReviewResource ref={ref} />);

      expect(ref).toHaveBeenCalled();
      expect(ref.mock.calls[0][0]).toBeInstanceOf(HTMLDivElement);
    });
  });
});
