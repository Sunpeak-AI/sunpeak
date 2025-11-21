import * as React from "react"
import { cn } from "@/lib/index"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/shadcn/carousel"

export type SunpeakCarouselProps = {
  children?: React.ReactNode
  gap?: number
  showArrows?: boolean
  showEdgeGradients?: boolean
  cardWidth?: number | { inline?: number; fullscreen?: number }
  className?: string
}

export const SunpeakCarousel = React.forwardRef<
  HTMLDivElement,
  SunpeakCarouselProps
>(
  (
    {
      children,
      gap = 16,
      showArrows = true,
      showEdgeGradients = true,
      cardWidth,
      className,
    },
    ref
  ) => {
    const childArray = React.Children.toArray(children)

    const getCardWidth = () => {
      if (typeof cardWidth === "number") {
        return `${cardWidth}px`
      }
      if (cardWidth?.inline) {
        return `${cardWidth.inline}px`
      }
      return "220px"
    }

    return (
      <div ref={ref} className={cn("relative w-full", className)}>
        {showEdgeGradients && (
          <>
            <div
              className="pointer-events-none absolute left-0 top-0 z-10 h-full w-12 bg-gradient-to-r from-background to-transparent"
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute right-0 top-0 z-10 h-full w-12 bg-gradient-to-l from-background to-transparent"
              aria-hidden="true"
            />
          </>
        )}

        <Carousel
          opts={{
            align: "start",
            dragFree: true,
          }}
          className="w-full"
        >
          <CarouselContent
            className="ml-0"
            style={{
              gap: `${gap}px`,
            }}
          >
            {childArray.map((child, index) => (
              <CarouselItem
                key={index}
                className="pl-0"
                style={{
                  flexBasis: getCardWidth(),
                  minWidth: getCardWidth(),
                }}
              >
                {child}
              </CarouselItem>
            ))}
          </CarouselContent>

          {showArrows && (
            <>
              <CarouselPrevious className="left-2" />
              <CarouselNext className="right-2" />
            </>
          )}
        </Carousel>
      </div>
    )
  }
)
SunpeakCarousel.displayName = "SunpeakCarousel"
