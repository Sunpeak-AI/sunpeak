import * as React from 'react';
import {
  useApp,
  useAppState,
  useToolData,
  useSafeArea,
  useViewport,
  useHostContext,
  useDisplayMode,
} from 'sunpeak';
import { Button } from '@openai/apps-sdk-ui/components/Button';
import { ExpandLg } from '@openai/apps-sdk-ui/components/Icon';

/**
 * Production-ready Review Resource
 *
 * A flexible review dialog that adapts to various use cases:
 * - Purchase reviews (items, totals, payment)
 * - Code change reviews (file changes with diffs)
 * - Social media post reviews (content preview)
 * - Booking reviews (details, dates, prices)
 * - Generic action reviews (simple approve/reject)
 */

// ============================================================================
// Type Definitions
// ============================================================================

/** A key-value detail row */
interface Detail {
  label: string;
  value: string;
  /** Optional sublabel/description */
  sublabel?: string;
  /** Highlight this row (e.g., for totals) */
  emphasis?: boolean;
}

/** An item with optional image and metadata (for purchases, lists) */
interface Item {
  id: string;
  title: string;
  subtitle?: string;
  /** Image URL */
  image?: string;
  /** Right-aligned value (e.g., price, quantity) */
  value?: string;
  /** Small badge text (e.g., "New", "Sale") */
  badge?: string;
}

/** A code/file change entry */
interface Change {
  id: string;
  type: 'create' | 'modify' | 'delete' | 'action';
  /** File path or identifier */
  path?: string;
  description: string;
  details?: string;
}

/** Alert/warning message */
interface Alert {
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
}

/** Content section - supports multiple display types */
interface Section {
  /** Optional section title */
  title?: string;
  /** Section content type */
  type: 'details' | 'items' | 'changes' | 'preview' | 'summary';
  /** Content data (type depends on section type) */
  content: Detail[] | Item[] | Change[] | string;
}

/** Tool call configuration for domain-specific review actions */
interface ReviewTool {
  /** Tool name to call (e.g., "complete_purchase", "publish_post") */
  name: string;
  /** Additional arguments to pass to the tool */
  arguments?: Record<string, unknown>;
}

interface ReviewData {
  /** Main title */
  title: string;
  /** Optional description below title */
  description?: string;
  /** Content sections */
  sections?: Section[];
  /** Alert messages to display */
  alerts?: Alert[];
  /** Accept button label */
  acceptLabel?: string;
  /** Reject button label */
  rejectLabel?: string;
  /** Use danger styling for accept button (for destructive actions) */
  acceptDanger?: boolean;
  /** Message shown after accepting */
  acceptedMessage?: string;
  /** Message shown after rejecting */
  rejectedMessage?: string;
  /** Domain-specific tool to call on review */
  reviewTool?: ReviewTool;
}

interface ReviewState {
  decision: 'accepted' | 'rejected' | null;
  decidedAt: string | null;
}

// ============================================================================
// Section Renderers
// ============================================================================

const changeTypeConfig = {
  create: { icon: '+', color: '#16a34a', bg: '#f0fdf4' },
  modify: { icon: '~', color: '#ca8a04', bg: '#fefce8' },
  delete: { icon: '\u2212', color: '#dc2626', bg: '#fef2f2' },
  action: { icon: '\u2192', color: '#2563eb', bg: '#eff6ff' },
};

const alertTypeConfig = {
  info: { icon: '\u2139', bg: '#eff6ff', border: '#bfdbfe', text: '#1e40af' },
  warning: { icon: '\u26A0', bg: '#fefce8', border: '#fde047', text: '#a16207' },
  error: { icon: '\u2715', bg: '#fef2f2', border: '#fecaca', text: '#b91c1c' },
  success: { icon: '\u2713', bg: '#f0fdf4', border: '#bbf7d0', text: '#15803d' },
};

function DetailsSection({ content }: { content: Detail[] }) {
  return (
    <div className="space-y-2">
      {content.map((detail, i) => (
        <div
          key={i}
          className={`flex justify-between items-start gap-4 ${
            detail.emphasis ? 'font-semibold pt-2 border-t border-subtle' : ''
          }`}
        >
          <div className="flex-1 min-w-0">
            <span className={detail.emphasis ? 'text-primary' : 'text-secondary'}>
              {detail.label}
            </span>
            {detail.sublabel && <p className="text-xs text-secondary mt-0.5">{detail.sublabel}</p>}
          </div>
          <span className="text-primary flex-shrink-0">{detail.value}</span>
        </div>
      ))}
    </div>
  );
}

function ItemsSection({ content }: { content: Item[] }) {
  return (
    <div className="space-y-3">
      {content.map((item) => (
        <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg bg-surface-secondary">
          {item.image && (
            <img
              src={item.image}
              alt={item.title}
              className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-primary truncate">{item.title}</span>
              {item.badge && (
                <span className="px-1.5 py-0.5 text-xs rounded bg-primary text-on-primary">
                  {item.badge}
                </span>
              )}
            </div>
            {item.subtitle && <p className="text-xs text-secondary truncate">{item.subtitle}</p>}
          </div>
          {item.value && (
            <span className="text-sm font-medium text-primary flex-shrink-0">{item.value}</span>
          )}
        </div>
      ))}
    </div>
  );
}

function ChangesSection({ content }: { content: Change[] }) {
  return (
    <ul className="space-y-2">
      {content.map((change) => {
        const config = changeTypeConfig[change.type];
        return (
          <li
            key={change.id}
            className="rounded-lg border border-subtle p-3"
            style={{ backgroundColor: config.bg }}
          >
            <div className="flex items-start gap-3">
              <span
                className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded font-mono font-bold bg-white"
                style={{
                  color: config.color,
                  borderWidth: 1,
                  borderStyle: 'solid',
                  borderColor: config.color,
                }}
              >
                {config.icon}
              </span>
              <div className="flex-1 min-w-0">
                {change.path && (
                  <code className="block text-xs text-secondary font-mono truncate mb-1">
                    {change.path}
                  </code>
                )}
                <p className="text-sm text-[#000000]">{change.description}</p>
                {change.details && <p className="mt-1 text-xs text-secondary">{change.details}</p>}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function PreviewSection({ content }: { content: string }) {
  return (
    <div className="p-4 rounded-lg bg-surface-secondary border border-subtle">
      <p className="text-sm text-primary whitespace-pre-wrap">{content}</p>
    </div>
  );
}

function SummarySection({ content }: { content: Detail[] }) {
  return (
    <div className="p-3 rounded-lg bg-surface-secondary space-y-1">
      {content.map((item, i) => (
        <div
          key={i}
          className={`flex justify-between items-center ${
            item.emphasis ? 'font-semibold text-lg pt-2 border-t border-subtle mt-2' : 'text-sm'
          }`}
        >
          <span className={item.emphasis ? 'text-primary' : 'text-secondary'}>{item.label}</span>
          <span className="text-primary">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

function SectionRenderer({ section }: { section: Section }) {
  const renderContent = () => {
    switch (section.type) {
      case 'details':
        return <DetailsSection content={section.content as Detail[]} />;
      case 'items':
        return <ItemsSection content={section.content as Item[]} />;
      case 'changes':
        return <ChangesSection content={section.content as Change[]} />;
      case 'preview':
        return <PreviewSection content={section.content as string} />;
      case 'summary':
        return <SummarySection content={section.content as Detail[]} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-2">
      {section.title && (
        <h2 className="text-sm font-medium text-secondary uppercase tracking-wide">
          {section.title}
        </h2>
      )}
      {renderContent()}
    </div>
  );
}

function AlertBanner({ alert }: { alert: Alert }) {
  const config = alertTypeConfig[alert.type];
  return (
    <div
      className="flex items-start gap-2 p-3 rounded-lg"
      style={{
        backgroundColor: config.bg,
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: config.border,
      }}
    >
      <span className="flex-shrink-0" style={{ color: config.text }}>
        {config.icon}
      </span>
      <p className="text-sm" style={{ color: config.text }}>
        {alert.message}
      </p>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ReviewResource() {
  const { app } = useApp({
    appInfo: { name: 'ReviewResource', version: '1.0.0' },
    capabilities: {},
  });

  const { output } = useToolData<unknown, ReviewData>(app, undefined, {
    title: 'Review',
    sections: [],
  });

  const [state, setState] = useAppState<ReviewState>(app, {
    decision: null,
    decidedAt: null,
  });

  const safeArea = useSafeArea(app);
  const viewport = useViewport(app);
  const context = useHostContext(app);
  const displayMode = useDisplayMode(app);

  const hasTouch = context?.deviceCapabilities?.touch ?? false;
  const decision = state.decision ?? null;
  const isFullscreen = displayMode === 'fullscreen';
  const data = output ?? { title: 'Review', sections: [] as Section[] };

  const handleRequestFullscreen = () => {
    app?.requestDisplayMode({ mode: 'fullscreen' });
  };

  const handleAccept = () => {
    const decidedAt = new Date().toISOString();
    setState({
      decision: 'accepted',
      decidedAt,
    });

    const tool = data.reviewTool;
    if (tool) {
      console.log('callTool', {
        name: tool.name,
        arguments: {
          ...tool.arguments,
          confirmed: true,
          decidedAt,
        },
      });
    }
  };

  const handleReject = () => {
    const decidedAt = new Date().toISOString();
    setState({
      decision: 'rejected',
      decidedAt,
    });

    const tool = data.reviewTool;
    if (tool) {
      console.log('callTool', {
        name: tool.name,
        arguments: {
          ...tool.arguments,
          confirmed: false,
          decidedAt,
        },
      });
    }
  };

  const acceptLabel = data.acceptLabel ?? 'Confirm';
  const rejectLabel = data.rejectLabel ?? 'Cancel';
  const acceptedMessage = data.acceptedMessage ?? 'Confirmed';
  const rejectedMessage = data.rejectedMessage ?? 'Cancelled';
  const sections = data.sections ?? [];
  const alerts = data.alerts ?? [];

  return (
    <div
      className="flex flex-col"
      style={{
        paddingTop: `${safeArea.top}px`,
        paddingBottom: `${safeArea.bottom}px`,
        paddingLeft: `${safeArea.left}px`,
        paddingRight: `${safeArea.right}px`,
        maxHeight: viewport?.maxHeight ?? undefined,
      }}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-subtle">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-semibold text-primary">{data.title}</h1>
            {data.description && <p className="mt-1 text-sm text-secondary">{data.description}</p>}
          </div>
          {!isFullscreen && (
            <Button
              variant="ghost"
              color="secondary"
              size="sm"
              onClick={handleRequestFullscreen}
              aria-label="Enter fullscreen"
              className="flex-shrink-0"
            >
              <ExpandLg className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="space-y-2">
            {alerts.map((alert, i) => (
              <AlertBanner key={i} alert={alert} />
            ))}
          </div>
        )}

        {/* Sections */}
        {sections.length === 0 ? (
          // Note: Apps cannot distinguish between "still loading" and "empty response".
          // We show a loading state as the optimistic assumption.
          <div className="flex items-center justify-center gap-2 py-8 text-secondary">
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            <span>Loading...</span>
          </div>
        ) : (
          sections.map((section, i) => <SectionRenderer key={i} section={section} />)
        )}
      </div>

      {/* Footer with Actions */}
      <div className="px-4 py-3 border-t border-subtle bg-surface">
        {decision === null ? (
          <div className="flex gap-3">
            <Button
              variant="outline"
              color="secondary"
              onClick={handleReject}
              size={hasTouch ? 'lg' : 'md'}
              className="flex-1"
            >
              {rejectLabel}
            </Button>
            <Button
              variant="solid"
              color={data.acceptDanger ? 'danger' : 'primary'}
              onClick={handleAccept}
              size={hasTouch ? 'lg' : 'md'}
              className="flex-1"
            >
              {acceptLabel}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <div
              className="flex items-center justify-center gap-2"
              style={{ color: decision === 'accepted' ? '#16a34a' : '#dc2626' }}
            >
              <span className="text-lg">{decision === 'accepted' ? '\u2713' : '\u2717'}</span>
              <span className="font-medium">
                {decision === 'accepted' ? acceptedMessage : rejectedMessage}
              </span>
            </div>
            {state.decidedAt && (
              <span className="text-xs text-secondary">
                {new Date(state.decidedAt).toLocaleString()}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
