import * as React from 'react';
import { cn } from '../lib/index';

type ButtonVariant = 'solid' | 'soft' | 'ghost' | 'outline';
type ButtonColor = 'primary' | 'secondary' | 'warning' | 'danger';
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  color?: ButtonColor;
  size?: ButtonSize;
  children?: React.ReactNode;
}

const sizeClasses: Record<ButtonSize, string> = {
  xs: 'h-6 px-2 text-xs gap-1',
  sm: 'h-7 px-3 text-sm gap-1.5',
  md: 'h-8 px-3.5 text-sm gap-2',
  lg: 'h-10 px-4 text-base gap-2',
};

// Colors reference CSS variables from the ChatGPT theme bundled with sunpeak,
// which are available in the template's iframe via sunpeak/chatgpt/globals.css.
const variantColorClasses: Record<ButtonVariant, Record<ButtonColor, string>> = {
  solid: {
    primary:
      'bg-[var(--color-background-primary-solid)] hover:bg-[var(--color-background-primary-solid-hover)] active:bg-[var(--color-background-primary-solid-active)] text-[var(--color-text-primary-solid)]',
    secondary:
      'bg-[var(--color-background-secondary-solid)] hover:bg-[var(--color-background-secondary-solid-hover)] active:bg-[var(--color-background-secondary-solid-active)] text-[var(--color-text-secondary-solid)]',
    warning:
      'bg-[var(--color-background-warning-solid)] hover:bg-[var(--color-background-warning-solid-hover)] active:bg-[var(--color-background-warning-solid-active)] text-[var(--color-text-warning-solid)]',
    danger:
      'bg-[var(--color-background-danger-solid)] hover:bg-[var(--color-background-danger-solid-hover)] active:bg-[var(--color-background-danger-solid-active)] text-[var(--color-text-danger-solid)]',
  },
  soft: {
    primary:
      'bg-[var(--color-background-primary-soft-alpha)] hover:bg-[var(--color-background-primary-soft-alpha-hover)] active:bg-[var(--color-background-primary-soft-alpha-active)] text-[var(--color-text-primary-soft)]',
    secondary:
      'bg-[var(--color-background-secondary-soft-alpha)] hover:bg-[var(--color-background-secondary-soft-alpha-hover)] active:bg-[var(--color-background-secondary-soft-alpha-active)] text-[var(--color-text-secondary-soft)]',
    warning:
      'bg-[var(--color-background-warning-soft-alpha)] hover:bg-[var(--color-background-warning-soft-alpha-hover)] active:bg-[var(--color-background-warning-soft-alpha-active)] text-[var(--color-text-warning-soft)]',
    danger:
      'bg-[var(--color-background-danger-soft-alpha)] hover:bg-[var(--color-background-danger-soft-alpha-hover)] active:bg-[var(--color-background-danger-soft-alpha-active)] text-[var(--color-text-danger-soft)]',
  },
  ghost: {
    primary:
      'bg-transparent hover:bg-[var(--color-background-primary-ghost-hover)] active:bg-[var(--color-background-primary-ghost-active)] text-[var(--color-text-primary-ghost)]',
    secondary:
      'bg-transparent hover:bg-[var(--color-background-secondary-ghost-hover)] active:bg-[var(--color-background-secondary-ghost-active)] text-[var(--color-text-secondary-ghost)]',
    warning:
      'bg-transparent hover:bg-[var(--color-background-warning-ghost-hover)] active:bg-[var(--color-background-warning-ghost-active)] text-[var(--color-text-warning-ghost)]',
    danger:
      'bg-transparent hover:bg-[var(--color-background-danger-ghost-hover)] active:bg-[var(--color-background-danger-ghost-active)] text-[var(--color-text-danger-ghost)]',
  },
  outline: {
    primary:
      'bg-transparent border border-[var(--color-border-primary-outline)] hover:bg-[var(--color-background-primary-outline-hover)] hover:border-[var(--color-border-primary-outline-hover)] active:bg-[var(--color-background-primary-outline-active)] text-[var(--color-text-primary-outline)] hover:text-[var(--color-text-primary-outline-hover)]',
    secondary:
      'bg-transparent border border-[var(--color-border-secondary-outline)] hover:bg-[var(--color-background-secondary-outline-hover)] hover:border-[var(--color-border-secondary-outline-hover)] active:bg-[var(--color-background-secondary-outline-active)] text-[var(--color-text-secondary-outline)] hover:text-[var(--color-text-secondary-outline-hover)]',
    warning:
      'bg-transparent border border-[var(--color-border-warning-outline)] hover:bg-[var(--color-background-warning-outline-hover)] hover:border-[var(--color-border-warning-outline-hover)] active:bg-[var(--color-background-warning-outline-active)] text-[var(--color-text-warning-outline)] hover:text-[var(--color-text-warning-outline-hover)]',
    danger:
      'bg-transparent border border-[var(--color-border-danger-outline)] hover:bg-[var(--color-background-danger-outline-hover)] hover:border-[var(--color-border-danger-outline-hover)] active:bg-[var(--color-background-danger-outline-active)] text-[var(--color-text-danger-outline)] hover:text-[var(--color-text-danger-outline-hover)]',
  },
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'solid', color = 'primary', size = 'md', className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          'inline-flex items-center justify-center font-medium transition-colors rounded-full cursor-pointer select-none flex-shrink-0 whitespace-nowrap',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          sizeClasses[size],
          variantColorClasses[variant][color],
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
