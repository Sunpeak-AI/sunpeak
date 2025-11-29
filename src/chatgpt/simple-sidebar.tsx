import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from '@openai/apps-sdk-ui/components/Icon';

interface SimpleSidebarProps {
  children: React.ReactNode;
  controls: React.ReactNode;
}

export function SimpleSidebar({ children, controls }: SimpleSidebarProps) {
  return (
    <div className="flex min-h-screen w-full">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-subtle bg-background">
        <div className="flex-1 overflow-auto p-4">
          <div className="space-y-6">
            <div>
              <h2 className="text-sm font-semibold mb-4">Controls</h2>
              {controls}
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}

interface SidebarControlProps {
  label: string;
  children: React.ReactNode;
}

export function SidebarControl({ label, children }: SidebarControlProps) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-secondary">{label}</label>
      {children}
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
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      switch (event.key) {
        case 'Escape':
          setIsOpen(false);
          break;
        case 'ArrowDown':
          event.preventDefault();
          setHighlightedIndex((prev) => (prev < options.length - 1 ? prev + 1 : 0));
          break;
        case 'ArrowUp':
          event.preventDefault();
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : options.length - 1));
          break;
        case 'Enter':
          event.preventDefault();
          if (highlightedIndex >= 0 && highlightedIndex < options.length) {
            onChange(options[highlightedIndex].value);
            setIsOpen(false);
          }
          break;
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, highlightedIndex, options, onChange]);

  const handleToggle = () => {
    if (!isOpen) {
      // Initialize highlighted index when opening
      const selectedIndex = options.findIndex((opt) => opt.value === value);
      setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
    }
    setIsOpen(!isOpen);
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={handleToggle}
        className={`
          relative inline-flex items-center justify-between w-full
          h-[var(--control-size-sm)] px-[var(--control-gutter-sm)]
          rounded-[var(--control-radius-sm)]
          text-[var(--control-font-size-md)] font-normal leading-[var(--font-text-md-line-height)]
          text-left cursor-pointer select-none whitespace-nowrap
          transition-[color] duration-[var(--transition-duration-basic)] ease-[var(--transition-ease-basic)]
          before:absolute before:inset-0 before:block before:rounded-[inherit]
          before:bg-transparent before:transition-[opacity,background-color,transform,box-shadow,border-color]
          before:duration-[var(--transition-duration-basic)] before:ease-[var(--transition-ease-basic)]
          before:shadow-[0_0_0_1px_var(--input-outline-border-color)_inset]
          hover:before:shadow-[0_0_0_1px_var(--input-outline-border-color-hover)_inset]
          focus:outline-none focus-visible:after:outline focus-visible:after:outline-2
          focus-visible:after:outline-[var(--color-ring)] focus-visible:after:outline-offset-[-1px]
          after:absolute after:inset-0 after:block after:rounded-[inherit] after:pointer-events-none
          after:transition-[transform] after:duration-[var(--transition-duration-basic)] after:ease-[var(--transition-ease-basic)]
          ${isOpen ? 'before:shadow-[0_0_0_1px_var(--input-outline-border-color-hover)_inset]' : ''}
          ${!selectedOption ? 'text-[var(--input-placeholder-text-color)]' : ''}
        `}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className="relative flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
          {selectedOption?.label || placeholder || 'Select...'}
        </span>
        <span className="relative flex items-center gap-[var(--spacing)]">
          <ChevronDown
            className={`
              relative text-secondary opacity-75
              transition-opacity duration-[var(--transition-duration-basic)] ease-[var(--transition-ease-basic)]
              ${isOpen ? 'opacity-100' : ''}
            `}
          />
        </span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          ref={listRef}
          className={`
            absolute z-50 mt-1 w-full min-w-[200px]
            rounded-[var(--menu-radius)] bg-[var(--color-surface-elevated)]
            shadow-[var(--shadow)] [box-shadow:var(--shadow),var(--shadow-hairline)]
            text-[var(--menu-font-size)] leading-[var(--menu-line-height)]
            select-none origin-top
            animate-in fade-in-0 zoom-in-95 duration-200
          `}
          role="listbox"
        >
          <div className="flex flex-col max-h-[min(400px,calc(100vh-200px))] focus:outline-none">
            <div className="overflow-auto flex-1 p-[var(--menu-gutter)]">
              {options.map((option, index) => (
                <div
                  key={option.value}
                  role="option"
                  aria-selected={option.value === value}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`
                    relative px-[var(--menu-item-padding-x,12px)] py-[var(--menu-item-padding-y,8px)]
                    cursor-pointer break-words scroll-m-[15px]
                    before:absolute before:inset-0 before:block
                    before:rounded-[calc(var(--menu-radius)-var(--menu-gutter))]
                    before:bg-[var(--menu-item-background-color)]
                    before:opacity-0 before:scale-[0.98]
                    before:transition-[opacity,background-color,transform]
                    before:duration-[var(--transition-duration-basic)]
                    before:ease-[var(--cubic-enter)]
                    ${option.value === value ? 'font-semibold' : ''}
                    ${highlightedIndex === index ? 'before:opacity-100 before:scale-100' : ''}
                  `}
                >
                  <span className="relative flex items-center gap-[var(--spacing)]">
                    {option.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
