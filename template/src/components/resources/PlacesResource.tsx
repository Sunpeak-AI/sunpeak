import * as React from "react"
import { useWidgetProps } from "sunpeak"
import { Carousel, Card } from ".."

/**
 * Production-ready Places Resource
 *
 * This resource displays places in a carousel layout with cards.
 * Can be dropped into any production environment without changes.
 */

export interface Place {
  id: string
  name: string
  rating: number
  category: string
  location: string
  image: string
  description: string
}

export interface PlacesData extends Record<string, unknown> {
  places: Place[]
}

export const PlacesResource = React.forwardRef<HTMLDivElement>((_props, ref) => {
  const data = useWidgetProps<PlacesData>(() => ({ places: [] }))

  return (
    <div ref={ref}>
      <Carousel gap={16} showArrows={true} showEdgeGradients={true} cardWidth={220}>
        {(data.places || []).map((place) => (
          <Card
            key={place.id}
            image={place.image}
            imageAlt={place.name}
            header={place.name}
            metadata={`⭐ ${place.rating} • ${place.category} • ${place.location}`}
            button1={{
              isPrimary: true,
              onClick: () => console.log(`Visit ${place.name}`),
              children: "Visit",
            }}
            button2={{
              isPrimary: false,
              onClick: () => console.log(`Learn more about ${place.name}`),
              children: "Learn More",
            }}
          >
            {place.description}
          </Card>
        ))}
      </Carousel>
    </div>
  )
})
PlacesResource.displayName = "PlacesResource"
