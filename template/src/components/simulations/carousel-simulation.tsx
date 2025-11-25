import * as React from "react"
import type { Simulation } from "sunpeak"
import { useWidgetProps } from "sunpeak"
import { Carousel, Card } from ".."
import placesData from "../../../data/places.json"

export interface Place {
  id: string
  name: string
  rating: number
  category: string
  location: string
  image: string
  description: string
}

export interface CarouselSimulationData extends Record<string, unknown> {
  places: Place[]
}

const CarouselComponent = React.forwardRef<HTMLDivElement>((_props, ref) => {
  const data = useWidgetProps<CarouselSimulationData>(() => ({ places: [] }))

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
CarouselComponent.displayName = "CarouselComponent"

export const carouselSimulation: Simulation = {
  value: 'carousel',
  label: 'Carousel',
  component: CarouselComponent,
  appName: 'Splorin',
  appIcon: '✈️',
  userMessage: 'Show me popular places to visit in Austin Texas',
  toolOutput: placesData,
  widgetState: null,
}
