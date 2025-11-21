import * as React from "react"
import { cn } from "@/lib/index"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/shadcn/card"
import { Button } from "@/components/shadcn/button"

export interface SunpeakButtonProps extends Omit<React.ComponentProps<typeof Button>, 'onClick'> {
  isPrimary?: boolean
  onClick: () => void
}

export interface SunpeakCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode
  image: string
  imageAlt: string
  imageMaxWidth?: number
  imageMaxHeight?: number
  header?: React.ReactNode
  metadata?: React.ReactNode
  button1?: SunpeakButtonProps
  button2?: SunpeakButtonProps
  variant?: "default" | "bordered" | "elevated"
}

export const SunpeakCard = React.forwardRef<HTMLDivElement, SunpeakCardProps>(
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
      variant = "default",
      className,
      onClick,
      ...props
    },
    ref
  ) => {
    const hasButtons = button1 || button2

    const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
      onClick?.(e)
    }

    const renderButton = (buttonProps: SunpeakButtonProps) => {
      const { isPrimary = false, onClick: buttonOnClick, children, ...restProps } = buttonProps

      const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation()
        buttonOnClick()
      }

      return (
        <Button
          {...restProps}
          variant={isPrimary ? "default" : "outline"}
          onClick={handleClick}
        >
          {children}
        </Button>
      )
    }

    const variantClasses = {
      default: "",
      bordered: "border-2",
      elevated: "shadow-lg",
    }

    return (
      <Card
        ref={ref}
        className={cn(
          "overflow-hidden cursor-pointer select-none",
          variantClasses[variant],
          className
        )}
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
        <div className="flex flex-col flex-1">
          {(header || metadata) && (
            <CardHeader className={cn(image && "pt-3")}>
              {header && (
                <CardTitle className="text-base font-medium leading-tight overflow-hidden text-ellipsis whitespace-nowrap">
                  {header}
                </CardTitle>
              )}
              {metadata && (
                <CardDescription className="text-xs leading-normal">
                  {metadata}
                </CardDescription>
              )}
            </CardHeader>
          )}
          {children && (
            <CardContent className={cn(
              "text-sm leading-normal",
              (header || metadata) && "pt-1"
            )}>
              <div className="line-clamp-2">{children}</div>
            </CardContent>
          )}
          {hasButtons && (
            <CardFooter className="flex gap-2 flex-wrap">
              {button1 && renderButton(button1)}
              {button2 && renderButton(button2)}
            </CardFooter>
          )}
        </div>
      </Card>
    )
  }
)
SunpeakCard.displayName = "SunpeakCard"
