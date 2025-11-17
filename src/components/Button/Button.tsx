import { type ButtonHTMLAttributes } from 'react';
import { clsx } from 'clsx';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  /**
   * Whether to use primary styling (accent color) or secondary (outlined)
   * @default false
   */
  isPrimary?: boolean;
  /**
   * Click handler (required)
   */
  onClick: () => void;
  /**
   * Button label
   */
  children: React.ReactNode;
}

/**
 * Button - A button component that follows platform design guidelines.
 * Requires an action handler. Use isPrimary to toggle between primary and secondary styles.
 *
 * Design specs:
 * - Primary (isPrimary=true): Accent color background, white text
 * - Secondary (isPrimary=false): Transparent background with border
 * - Both: 14px medium font, rounded corners, hover/active states
 */
export const Button = ({
  isPrimary = false,
  onClick,
  children,
  className,
  type = 'button',
  ...props
}: ButtonProps) => {
  const buttonClasses = clsx(
    'sp-button',
    {
      'sp-button-primary': isPrimary,
      'sp-button-secondary': !isPrimary,
    },
    className
  );

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onClick();
  };

  return (
    <button className={buttonClasses} onClick={handleClick} type={type} {...props}>
      {children}
    </button>
  );
};
