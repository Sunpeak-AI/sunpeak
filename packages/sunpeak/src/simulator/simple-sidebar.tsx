import * as React from 'react';
import { useState } from 'react';

interface SimpleSidebarProps {
  children: React.ReactNode;
  controls: React.ReactNode;
  /** Optional element rendered right-aligned in the Controls header row */
  headerRight?: React.ReactNode;
}

const DEFAULT_SIDEBAR_WIDTH = 224; // w-56 = 14rem = 224px

function ChevronRightIcon() {
  return (
    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M8.293 4.293a1 1 0 0 1 1.414 0l7 7a1 1 0 0 1 0 1.414l-7 7a1 1 0 0 1-1.414-1.414L14.586 12 8.293 5.707a1 1 0 0 1 0-1.414Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function SimpleSidebar({ children, controls, headerRight }: SimpleSidebarProps) {
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
  const [sidebarWidth, setSidebarWidth] = React.useState(DEFAULT_SIDEBAR_WIDTH);
  const [isResizing, setIsResizing] = React.useState(false);

  const handleMouseDown = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  React.useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const maxWidth = Math.floor(window.innerWidth / 3);
      const newWidth = Math.min(maxWidth, Math.max(DEFAULT_SIDEBAR_WIDTH, e.clientX));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  return (
    <div className="sunpeak-simulator-root flex h-screen w-full overflow-hidden relative">
      {/* Resize overlay to capture mouse events during drag */}
      {isResizing && <div className="fixed inset-0 z-50 cursor-col-resize" />}

      {/* Mobile drawer overlay */}
      {isDrawerOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40 pointer-events-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsDrawerOpen(false);
            }
          }}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          relative flex flex-col bg-sidebar
          md:z-auto
          max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-[100]
          max-md:transition-transform max-md:duration-300 max-md:!w-2/3
          ${isDrawerOpen ? 'max-md:translate-x-0' : 'max-md:-translate-x-full'}
        `}
        style={{
          width: sidebarWidth,
          borderRight: '1px solid var(--color-border-primary)',
        }}
      >
        <div className="flex-1 overflow-y-auto min-h-0 px-3 pb-3 pt-0">
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between sticky top-0 bg-sidebar z-10 py-2">
                <h2
                  className="text-xs font-semibold"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  Controls
                </h2>
                <div className="flex items-center gap-2">
                  {headerRight}
                  {/* Close button for mobile */}
                  <button
                    onClick={() => setIsDrawerOpen(false)}
                    className="md:hidden p-1 transition-colors"
                    style={{ color: 'var(--color-text-secondary)' }}
                    type="button"
                    aria-label="Close sidebar"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M12 4L4 12M4 4L12 12"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                </div>
              </div>
              {controls}
            </div>
          </div>
        </div>

        {/* Resize handle */}
        <div
          onMouseDown={handleMouseDown}
          className="hidden md:block absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-black/10 dark:hover:bg-white/10 active:bg-black/20 dark:active:bg-white/20 transition-colors"
        />
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto relative">
        {/* Mobile drawer toggle button */}
        <button
          onClick={() => setIsDrawerOpen(true)}
          className="md:hidden fixed top-18 left-0 z-30 bg-sidebar rounded-r-md p-2 shadow-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          style={{
            borderRight: '1px solid var(--color-border-primary)',
            borderTop: '1px solid var(--color-border-primary)',
            borderBottom: '1px solid var(--color-border-primary)',
          }}
          type="button"
          aria-label="Open sidebar"
        >
          <ChevronRightIcon />
        </button>
        {children}
      </main>
    </div>
  );
}

/* ── Help icon with tooltip ── */

const DOCS_BASE_URL = 'https://sunpeak.ai/docs';

interface HelpIconProps {
  tooltip: string;
  docsPath: string;
}

function HelpIcon({ tooltip, docsPath }: HelpIconProps) {
  const [pos, setPos] = React.useState<{ top: number; left: number } | null>(null);
  const ref = React.useRef<HTMLAnchorElement>(null);

  const showTooltip = () => {
    const rect = ref.current?.getBoundingClientRect();
    if (rect) {
      setPos({ top: rect.top + rect.height / 2, left: rect.right + 6 });
    }
  };

  return (
    <a
      ref={ref}
      href={`${DOCS_BASE_URL}/${docsPath}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center justify-center no-underline flex-shrink-0 transition-colors"
      style={{
        color: 'var(--color-text-tertiary, var(--color-text-secondary))',
      }}
      onClick={(e) => e.stopPropagation()}
      onMouseEnter={showTooltip}
      onMouseLeave={() => setPos(null)}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="6" cy="6" r="5.25" stroke="currentColor" strokeWidth="1" />
        <text
          x="6.25"
          y="8.5"
          textAnchor="middle"
          fill="currentColor"
          fontSize="7.5"
          fontWeight="600"
          fontFamily="system-ui, sans-serif"
        >
          ?
        </text>
      </svg>
      {pos && (
        <span
          className="pointer-events-none fixed whitespace-nowrap rounded px-2 py-1 text-[11px] font-normal leading-tight z-[200]"
          style={{
            top: pos.top,
            left: pos.left,
            transform: 'translateY(-50%)',
            backgroundColor: 'var(--color-text-primary)',
            color: 'var(--color-background-primary)',
          }}
        >
          {tooltip}
        </span>
      )}
    </a>
  );
}

interface SidebarControlProps {
  label: string;
  children: React.ReactNode;
  /** Short tooltip shown on hover of the help icon */
  tooltip?: string;
  /** Docs path appended to https://sunpeak.ai/docs/ */
  docsPath?: string;
}

export function SidebarControl({ label, children, tooltip, docsPath }: SidebarControlProps) {
  return (
    <div className="space-y-1">
      <span
        className="text-[10px] font-medium leading-tight inline-flex items-center gap-1"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        {label}
        {tooltip && docsPath && <HelpIcon tooltip={tooltip} docsPath={docsPath} />}
      </span>
      {children}
    </div>
  );
}

interface SidebarCollapsibleControlProps {
  label: string;
  children: React.ReactNode;
  defaultCollapsed?: boolean;
  /** Short tooltip shown on hover of the help icon */
  tooltip?: string;
  /** Docs path appended to https://sunpeak.ai/docs/ */
  docsPath?: string;
}

export function SidebarCollapsibleControl({
  label,
  children,
  defaultCollapsed = true,
  tooltip,
  docsPath,
}: SidebarCollapsibleControlProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);

  return (
    <div className="space-y-1">
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center justify-between text-[10px] font-medium leading-tight transition-colors py-1 cursor-pointer"
        style={{ color: 'var(--color-text-secondary)' }}
        type="button"
      >
        <span className="inline-flex items-center gap-1">
          {label}
          {tooltip && docsPath && <HelpIcon tooltip={tooltip} docsPath={docsPath} />}
        </span>
        <span className="text-[8px]">{isCollapsed ? '▶' : '▼'}</span>
      </button>
      {!isCollapsed && children}
    </div>
  );
}

/* ── Shared form element styles ── */

const formElementStyle: React.CSSProperties = {
  color: 'var(--color-text-primary)',
  backgroundColor: 'var(--color-background-primary)',
  cursor: 'pointer',
};

interface SidebarSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
}

export function SidebarSelect({ value, onChange, options, placeholder }: SidebarSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-7 text-xs rounded-full px-2 outline-none appearance-none bg-no-repeat bg-[length:12px] bg-[right_6px_center]"
      style={{
        ...formElementStyle,
        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='%236b7280'%3e%3cpath d='M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z'/%3e%3c/svg%3e")`,
        paddingRight: '1.5rem',
      }}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

interface SidebarInputProps {
  value: string;
  onChange: (value: string) => void;
  /** When provided, onChange is only called on blur instead of on every keystroke. */
  applyOnBlur?: boolean;
  placeholder?: string;
  type?: 'text' | 'number';
  disabled?: boolean;
}

export function SidebarInput({
  value,
  onChange,
  applyOnBlur = false,
  placeholder,
  type = 'text',
  disabled = false,
}: SidebarInputProps) {
  const [draft, setDraft] = useState(value);
  const [isEditing, setIsEditing] = useState(false);
  const [prevValue, setPrevValue] = useState(value);

  // Sync draft when the controlled value changes externally (while not editing).
  // Done during render (not in an effect) to avoid cascading renders.
  if (!isEditing && value !== prevValue) {
    setPrevValue(value);
    setDraft(value);
  }

  if (applyOnBlur) {
    return (
      <input
        type={type}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={() => setIsEditing(true)}
        onBlur={() => {
          setIsEditing(false);
          onChange(draft);
        }}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full h-7 text-xs rounded-md px-2 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ ...formElementStyle, cursor: disabled ? undefined : 'text' }}
      />
    );
  }

  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full h-7 text-xs rounded-md px-2 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ ...formElementStyle, cursor: disabled ? undefined : 'text' }}
    />
  );
}

interface SidebarCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  /** Short tooltip shown on hover of the help icon */
  tooltip?: string;
  /** Docs path appended to https://sunpeak.ai/docs/ */
  docsPath?: string;
}

export function SidebarCheckbox({
  checked,
  onChange,
  label,
  tooltip,
  docsPath,
}: SidebarCheckboxProps) {
  const id = React.useId();
  return (
    <div className="flex items-center gap-1.5">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="outline-none cursor-pointer"
      />
      <label
        htmlFor={id}
        className="text-[11px] select-none cursor-pointer leading-tight inline-flex items-center gap-1"
        style={{ color: 'var(--color-text-primary)' }}
      >
        {label}
        {tooltip && docsPath && <HelpIcon tooltip={tooltip} docsPath={docsPath} />}
      </label>
    </div>
  );
}

interface SidebarTextareaProps {
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  placeholder?: string;
  maxRows?: number;
  error?: string;
}

export function SidebarTextarea({
  value,
  onChange,
  onFocus,
  onBlur,
  placeholder,
  maxRows = 8,
  error,
}: SidebarTextareaProps) {
  const contentRows = value?.split('\n').length ?? 1;
  const rows = Math.min(contentRows, maxRows);

  return (
    <div className="space-y-0.5">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder={placeholder}
        rows={rows}
        className="w-full text-[10px] font-mono rounded-md px-2 py-1.5 outline-none resize-y"
        style={{
          ...formElementStyle,
          cursor: 'text',
          whiteSpace: 'pre',
          overflowX: 'auto',
          overflowWrap: 'normal',
          ...(error ? { boxShadow: 'inset 0 0 0 1px var(--color-text-danger, #dc2626)' } : {}),
        }}
        aria-invalid={!!error}
      />
      {error && (
        <div className="text-[9px]" style={{ color: 'var(--color-text-danger, #dc2626)' }}>
          {error}
        </div>
      )}
    </div>
  );
}

interface SidebarToggleProps {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}

export function SidebarToggle({ value, onChange, options }: SidebarToggleProps) {
  return (
    <div
      className="inline-flex w-full rounded-full p-[3px] gap-0.5"
      style={{ backgroundColor: 'var(--color-background-tertiary)' }}
      role="group"
      aria-label="Toggle options"
    >
      {options.map((option) => {
        const isSelected = value === option.value;
        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            aria-pressed={isSelected}
            className="flex-1 text-[10px] font-medium h-[22px] px-2 rounded-full outline-none transition-all duration-150 cursor-pointer"
            style={{
              backgroundColor: isSelected ? 'var(--color-background-primary)' : 'transparent',
              color: isSelected ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
              boxShadow: isSelected ? '0 1px 2px 0 rgba(0,0,0,0.06)' : 'none',
            }}
            type="button"
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
