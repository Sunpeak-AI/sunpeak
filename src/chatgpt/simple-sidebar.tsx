import * as React from 'react';
import { Select } from '@openai/apps-sdk-ui/components/Select';
import { Input } from '@openai/apps-sdk-ui/components/Input';
import { Checkbox } from '@openai/apps-sdk-ui/components/Checkbox';
import { Textarea } from '@openai/apps-sdk-ui/components/Textarea';
import { SegmentedControl } from '@openai/apps-sdk-ui/components/SegmentedControl';

interface SimpleSidebarProps {
  children: React.ReactNode;
  controls: React.ReactNode;
}

export function SimpleSidebar({ children, controls }: SimpleSidebarProps) {
  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Sidebar */}
      <aside className="max-md:hidden md:flex w-56 flex-col border-r border-subtle bg-background h-screen overflow-y-auto">
        <div className="p-3">
          <div className="space-y-3">
            <div>
              <h2 className="text-xs font-semibold sticky top-0 bg-background z-10">Controls</h2>
              {controls}
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto h-screen">{children}</main>
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
      <label className="text-[10px] font-medium text-secondary leading-tight">{label}</label>
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
}

export function SidebarInput({ value, onChange, placeholder, type = 'text' }: SidebarInputProps) {
  return (
    <Input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      size="2xs"
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
  rows?: number;
  error?: string;
}

export function SidebarTextarea({
  value,
  onChange,
  onFocus,
  onBlur,
  placeholder,
  rows = 2,
  error,
}: SidebarTextareaProps) {
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
        className="text-[10px] font-mono"
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
