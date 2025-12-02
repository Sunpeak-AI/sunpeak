import * as React from 'react';
import { Button } from '@openai/apps-sdk-ui/components/Button';
import { cn } from '../../lib/index';

export interface CardButtonProps {
  isPrimary?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  image?: string;
  imageAlt?: string;
  imageMaxWidth?: number;
  imageMaxHeight?: number;
  header?: React.ReactNode;
  metadata?: React.ReactNode;
  button1?: CardButtonProps;
  button2?: CardButtonProps;
  variant?: 'default' | 'bordered' | 'elevated';
  buttonSize?: 'xs' | 'sm' | 'md' | 'lg';
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      children,
      image,
      imageAlt,
      imageMaxWidth = 400,
      imageMaxHeight = 400,
      header,
      metadata,
      button1,
      button2,
      variant = 'default',
      buttonSize = 'sm',
      className,
      onClick,
      ...props
    },
    ref
  ) => {
    const variantClasses = {
      default: 'border border-subtle bg-surface',
      bordered: 'border-2 border-default bg-surface',
      elevated: 'border border-subtle bg-surface shadow-lg',
    };

    const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
      onClick?.(e);
    };

    const renderButton = (buttonProps: CardButtonProps) => {
      const { isPrimary = false, onClick: buttonOnClick, children } = buttonProps;

      const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        buttonOnClick();
      };

      return (
        <Button
          color={isPrimary ? 'primary' : 'secondary'}
          variant={isPrimary ? 'solid' : 'soft'}
          onClick={handleClick}
          size={buttonSize}
        >
          {children}
        </Button>
      );
    };

    const hasButtons = button1 || button2;

    return (
      <div
        ref={ref}
        className={cn(
          'overflow-hidden rounded-2xl cursor-pointer select-none',
          variantClasses[variant],
          className
        )}
        style={{
          maxWidth: image ? `${imageMaxWidth}px` : undefined,
          ...props.style,
        }}
        onClick={handleCardClick}
        {...props}
      >
        {image && (
          <div className="w-full overflow-hidden">
            <img
              src={image}
              alt={imageAlt}
              loading="lazy"
              className="w-full h-auto aspect-square object-cover"
              style={{
                maxWidth: `${imageMaxWidth}px`,
                maxHeight: `${imageMaxHeight}px`,
              }}
            />
          </div>
        )}
        <div className="flex flex-col flex-1 p-4">
          {header && (
            <h2 className="font-medium text-base leading-tight overflow-hidden text-ellipsis whitespace-nowrap mb-2">
              {header}
            </h2>
          )}
          {metadata && <p className="text-secondary text-xs mb-1">{metadata}</p>}
          {children && <div className="text-sm leading-normal line-clamp-2 mb-3">{children}</div>}
          {hasButtons && (
            <div className="flex gap-2 flex-wrap mt-auto">
              {button1 && renderButton(button1)}
              {button2 && renderButton(button2)}
            </div>
          )}
        </div>
      </div>
    );
  }
);
Card.displayName = 'Card';
