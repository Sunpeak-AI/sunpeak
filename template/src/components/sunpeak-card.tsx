import * as React from "react"
import { useWidgetState } from "sunpeak"
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

export interface SunpeakCardData extends Record<string, unknown> {
  image?: string
  imageAlt?: string
  imageMaxWidth?: number
  imageMaxHeight?: number
  header?: React.ReactNode
  metadata?: React.ReactNode
  children?: React.ReactNode
  button1?: SunpeakButtonProps
  button2?: SunpeakButtonProps
  variant?: "default" | "bordered" | "elevated"
}

export interface SunpeakCardState extends Record<string, unknown> {
  selectedVariant?: "default" | "bordered" | "elevated"
}

export interface SunpeakCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode
  image?: string
  imageAlt?: string
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
      children: childrenProp,
      image: imageProp,
      imageAlt: imageAltProp,
      imageMaxWidth: imageMaxWidthProp = 400,
      imageMaxHeight: imageMaxHeightProp = 400,
      header: headerProp,
      metadata: metadataProp,
      button1: button1Prop,
      button2: button2Prop,
      variant: variantProp = "default",
      className,
      onClick,
      ...props
    },
    ref
  ) => {
    const [widgetState] = useWidgetState<SunpeakCardState>(() => ({}))

    const children = childrenProp
    const image = imageProp
    const imageAlt = imageAltProp
    const imageMaxWidth = imageMaxWidthProp
    const imageMaxHeight = imageMaxHeightProp
    const header = headerProp
    const metadata = metadataProp
    const button1 = button1Prop
    const button2 = button2Prop
    const variant = widgetState?.selectedVariant ?? variantProp

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
            <CardHeader className={cn("p-3", image && "pt-2")}>
              {header && (
                <CardTitle className="text-sm font-medium leading-tight overflow-hidden text-ellipsis whitespace-nowrap">
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
              "px-3 pb-3 text-sm leading-normal",
              (header || metadata) ? "pt-0" : "pt-3"
            )}>
              <div className="line-clamp-2">{children}</div>
            </CardContent>
          )}
          {hasButtons && (
            <CardFooter className="flex gap-2 flex-wrap px-3 pb-3 pt-0">
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
