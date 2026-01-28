import * as React from 'react';
import { Select } from '@openai/apps-sdk-ui/components/Select';
import { ChevronRight } from '@openai/apps-sdk-ui/components/Icon';
import { Input } from '@openai/apps-sdk-ui/components/Input';
import { Checkbox } from '@openai/apps-sdk-ui/components/Checkbox';
import { Textarea } from '@openai/apps-sdk-ui/components/Textarea';
import { SegmentedControl } from '@openai/apps-sdk-ui/components/SegmentedControl';

interface SimpleSidebarProps {
  children: React.ReactNode;
  controls: React.ReactNode;
}

const DEFAULT_SIDEBAR_WIDTH = 224; // w-56 = 14rem = 224px

export function SimpleSidebar({ children, controls }: SimpleSidebarProps) {
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
            // Only close if clicking directly on the overlay
            if (e.target === e.currentTarget) {
              setIsDrawerOpen(false);
            }
          }}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          relative flex flex-col border-r border-subtle bg-sidebar
          md:z-auto
          max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-[100]
          max-md:transition-transform max-md:duration-300 max-md:!w-2/3
          ${isDrawerOpen ? 'max-md:translate-x-0' : 'max-md:-translate-x-full'}
        `}
        style={{ width: sidebarWidth }}
      >
        <div className="flex-1 overflow-y-auto min-h-0 px-3 pb-3 pt-0">
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between sticky top-0 bg-sidebar z-10 py-2">
                <h2 className="text-xs font-semibold">Controls</h2>
                {/* Close button for mobile */}
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="md:hidden text-secondary hover:text-primary transition-colors p-1"
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
              {controls}
            </div>
          </div>
        </div>

        {/* Resize handle */}
        <div
          onMouseDown={handleMouseDown}
          className="hidden md:block absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 active:bg-primary/30 transition-colors"
        />
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto relative">
        {/* Mobile drawer toggle button */}
        <button
          onClick={() => setIsDrawerOpen(true)}
          className="md:hidden fixed top-18 left-0 z-30 bg-sidebar border-r border-t border-b border-subtle rounded-r-md p-2 shadow-lg hover:bg-primary/10 transition-colors"
          type="button"
          aria-label="Open sidebar"
        >
          <ChevronRight />
        </button>
        {children}
      </main>
    </div>
  );
}

interface SidebarControlProps {
  label: string;
  children: React.ReactNode;
}

export function SidebarControl({ label, children }: SidebarControlProps) {
  return (
    <div className="space-y-1">
      <span className="text-[10px] font-medium text-secondary leading-tight">{label}</span>
      {children}
    </div>
  );
}

interface SidebarCollapsibleControlProps {
  label: string;
  children: React.ReactNode;
  defaultCollapsed?: boolean;
}

export function SidebarCollapsibleControl({
  label,
  children,
  defaultCollapsed = true,
}: SidebarCollapsibleControlProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);

  return (
    <div className="space-y-1">
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center justify-between text-[10px] font-medium text-secondary leading-tight hover:text-primary transition-colors py-1"
        type="button"
      >
        <span>{label}</span>
        <span className="text-[8px]">{isCollapsed ? '▶' : '▼'}</span>
      </button>
      {!isCollapsed && children}
    </div>
  );
}

interface SidebarSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
}

export function SidebarSelect({ value, onChange, options, placeholder }: SidebarSelectProps) {
  return (
    <Select
      value={value}
      onChange={(option) => onChange(option.value)}
      options={options}
      placeholder={placeholder}
      size="2xs"
      block
    />
  );
}

interface SidebarInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'number';
  disabled?: boolean;
}

export function SidebarInput({
  value,
  onChange,
  placeholder,
  type = 'text',
  disabled = false,
}: SidebarInputProps) {
  return (
    <Input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      size="2xs"
      disabled={disabled}
    />
  );
}

interface SidebarCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}

export function SidebarCheckbox({ checked, onChange, label }: SidebarCheckboxProps) {
  return (
    <Checkbox
      checked={checked}
      onCheckedChange={onChange}
      label={<span className="text-[10px]">{label}</span>}
    />
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
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder={placeholder}
        rows={rows}
        size="2xs"
        className="text-[10px] font-mono resize-y [&>textarea]:!h-full [&>textarea]:!max-h-none [&>textarea]:!min-h-0"
        style={{ whiteSpace: 'pre', overflowX: 'auto', overflowWrap: 'normal' }}
        invalid={!!error}
      />
      {error && <div className="text-[9px] text-[var(--color-error)]">{error}</div>}
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
    <SegmentedControl
      value={value}
      onChange={onChange}
      aria-label="Toggle options"
      size="2xs"
      block
    >
      {options.map((option) => (
        <SegmentedControl.Option key={option.value} value={option.value}>
          {option.label}
        </SegmentedControl.Option>
      ))}
    </SegmentedControl>
  );
}
