import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReviewResource } from './review-resource';

// Mock sunpeak hooks
const mockSetState = vi.fn();
const mockRequestDisplayMode = vi.fn();

let mockToolOutput: Record<string, unknown> = { title: 'Test Review' };
let mockState: Record<string, unknown> = { decision: null, decidedAt: null };
let mockHostContext: {
  deviceCapabilities?: { hover: boolean; touch: boolean };
} | null = {
  deviceCapabilities: { hover: true, touch: false },
};
let mockDisplayMode: 'inline' | 'fullscreen' = 'inline';

const mockApp = {
  requestDisplayMode: mockRequestDisplayMode,
};

vi.mock('sunpeak', () => ({
  useApp: () => mockApp,
  useToolData: (_defaultInput: unknown, defaultOutput: Record<string, unknown>) => ({
    output: { ...defaultOutput, ...mockToolOutput },
    input: null,
    inputPartial: null,
    isError: false,
    isLoading: false,
    isCancelled: false,
    cancelReason: null,
  }),
  useHostContext: () => mockHostContext,
  useDisplayMode: () => mockDisplayMode,
  useAppState: () => [mockState, mockSetState],
  SafeArea: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
    <div data-testid="safe-area" {...props}>
      {children}
    </div>
  ),
}));

// Mock Button component
vi.mock('../../components/button', () => ({
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
vi.mock('../../components/icon', () => ({
  ExpandLg: ({ className }: { className?: string }) => (
    <span data-testid="expand-icon" className={className}>
      Expand
    </span>
  ),
}));

describe('ReviewResource', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockToolOutput = { title: 'Test Review' };
    mockState = { decision: null, decidedAt: null };
    mockHostContext = { deviceCapabilities: { hover: true, touch: false } };
    mockDisplayMode = 'inline';
  });

  describe('Basic Rendering', () => {
    it('renders with title', () => {
      mockToolOutput = { title: 'Confirm Purchase' };

      render(<ReviewResource />);

      expect(screen.getByText('Confirm Purchase')).toBeInTheDocument();
    });

    it('renders with description', () => {
      mockToolOutput = {
        title: 'Test',
        description: 'Please review the following items',
      };

      render(<ReviewResource />);

      expect(screen.getByText('Please review the following items')).toBeInTheDocument();
    });

    it('renders loading when no sections', () => {
      mockToolOutput = { title: 'Test', sections: [] };

      render(<ReviewResource />);

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('renders default button labels', () => {
      render(<ReviewResource />);

      expect(screen.getByText('Confirm')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('renders custom button labels', () => {
      mockToolOutput = {
        title: 'Test',
        acceptLabel: 'Approve',
        rejectLabel: 'Decline',
      };

      render(<ReviewResource />);

      expect(screen.getByText('Approve')).toBeInTheDocument();
      expect(screen.getByText('Decline')).toBeInTheDocument();
    });

    it('calls setState with accepted decision when accept clicked', () => {
      render(<ReviewResource />);

      const acceptButton = screen.getByText('Confirm');
      fireEvent.click(acceptButton);

      expect(mockSetState).toHaveBeenCalledWith(
        expect.objectContaining({
          decision: 'accepted',
          decidedAt: expect.any(String),
        })
      );
    });

    it('calls setState with rejected decision when reject clicked', () => {
      render(<ReviewResource />);

      const rejectButton = screen.getByText('Cancel');
      fireEvent.click(rejectButton);

      expect(mockSetState).toHaveBeenCalledWith(
        expect.objectContaining({
          decision: 'rejected',
          decidedAt: expect.any(String),
        })
      );
    });

    it('renders danger styling for accept button when acceptDanger is true', () => {
      mockToolOutput = { title: 'Test', acceptDanger: true };

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
      mockState = { decision: 'accepted', decidedAt: '2024-01-01T00:00:00.000Z' };

      render(<ReviewResource />);

      expect(screen.getByText('Confirmed')).toBeInTheDocument();
      expect(screen.queryByText('Confirm')).not.toBeInTheDocument();
    });

    it('shows rejected message after rejecting', () => {
      mockState = { decision: 'rejected', decidedAt: '2024-01-01T00:00:00.000Z' };

      render(<ReviewResource />);

      expect(screen.getByText('Cancelled')).toBeInTheDocument();
      expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
    });

    it('shows custom accepted message', () => {
      mockToolOutput = { title: 'Test', acceptedMessage: 'Order Placed!' };
      mockState = { decision: 'accepted', decidedAt: '2024-01-01T00:00:00.000Z' };

      render(<ReviewResource />);

      expect(screen.getByText('Order Placed!')).toBeInTheDocument();
    });

    it('shows custom rejected message', () => {
      mockToolOutput = { title: 'Test', rejectedMessage: 'Order Cancelled' };
      mockState = { decision: 'rejected', decidedAt: '2024-01-01T00:00:00.000Z' };

      render(<ReviewResource />);

      expect(screen.getByText('Order Cancelled')).toBeInTheDocument();
    });

    it('shows decidedAt timestamp', () => {
      mockState = { decision: 'accepted', decidedAt: '2024-01-15T10:30:00.000Z' };

      render(<ReviewResource />);

      // The timestamp should be displayed
      const timestampElement = screen.getByText(/2024/);
      expect(timestampElement).toBeInTheDocument();
    });
  });

  describe('Sections', () => {
    it('renders details section', () => {
      mockToolOutput = {
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
      mockToolOutput = {
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
      mockToolOutput = {
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
      mockToolOutput = {
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
      mockToolOutput = {
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
      mockToolOutput = {
        title: 'Test',
        alerts: [{ type: 'info', message: 'This is informational' }],
      };

      render(<ReviewResource />);

      expect(screen.getByText('This is informational')).toBeInTheDocument();
    });

    it('renders warning alert', () => {
      mockToolOutput = {
        title: 'Test',
        alerts: [{ type: 'warning', message: 'Please review carefully' }],
      };

      render(<ReviewResource />);

      expect(screen.getByText('Please review carefully')).toBeInTheDocument();
    });

    it('renders error alert', () => {
      mockToolOutput = {
        title: 'Test',
        alerts: [{ type: 'error', message: 'Something went wrong' }],
      };

      render(<ReviewResource />);

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('renders success alert', () => {
      mockToolOutput = {
        title: 'Test',
        alerts: [{ type: 'success', message: 'All checks passed' }],
      };

      render(<ReviewResource />);

      expect(screen.getByText('All checks passed')).toBeInTheDocument();
    });

    it('renders multiple alerts', () => {
      mockToolOutput = {
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

  describe('SafeArea and Layout', () => {
    it('wraps content in SafeArea', () => {
      render(<ReviewResource />);

      const safeArea = screen.getByTestId('safe-area');
      expect(safeArea).toBeInTheDocument();
    });

    it('handles null host context', () => {
      mockHostContext = null;

      // Should render without errors
      render(<ReviewResource />);
      expect(screen.getByText('Test Review')).toBeInTheDocument();
    });
  });

  describe('Touch Device Support', () => {
    it('renders larger buttons for touch devices', () => {
      mockHostContext = { deviceCapabilities: { hover: false, touch: true } };

      render(<ReviewResource />);

      const acceptButton = screen.getByText('Confirm');
      const rejectButton = screen.getByText('Cancel');

      expect(acceptButton).toHaveAttribute('data-size', 'lg');
      expect(rejectButton).toHaveAttribute('data-size', 'lg');
    });

    it('renders standard buttons for non-touch devices', () => {
      mockHostContext = { deviceCapabilities: { hover: true, touch: false } };

      render(<ReviewResource />);

      const acceptButton = screen.getByText('Confirm');
      const rejectButton = screen.getByText('Cancel');

      expect(acceptButton).toHaveAttribute('data-size', 'md');
      expect(rejectButton).toHaveAttribute('data-size', 'md');
    });

    it('handles null host context gracefully', () => {
      mockHostContext = null;

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
});
