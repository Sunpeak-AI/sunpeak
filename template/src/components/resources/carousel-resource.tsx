import * as React from 'react';
import { useWidgetProps } from 'sunpeak';
import { Carousel } from '../carousel/carousel';
import { Card } from '../card/card';

/**
 * Production-ready Carousel Resource
 *
 * This resource displays places in a carousel layout with cards.
 * Can be dropped into any production environment without changes.
 */

interface CarouselCard {
  id: string;
  name: string;
  rating: number;
  category: string;
  location: string;
  image: string;
  description: string;
}

interface CarouselData extends Record<string, unknown> {
  places: CarouselCard[];
}

export const CarouselResource = React.forwardRef<HTMLDivElement>((_props, ref) => {
  const data = useWidgetProps<CarouselData>(() => ({ places: [] }));

  return (
    <div ref={ref}>
      <Carousel gap={16} showArrows={true} showEdgeGradients={true} cardWidth={220}>
        {(data.places || []).map((place: CarouselCard) => (
          <Card
            key={place.id}
            image={place.image}
            imageAlt={place.name}
            header={place.name}
            metadata={`⭐ ${place.rating} • ${place.category} • ${place.location}`}
            button1={{
              isPrimary: true,
              onClick: () => console.log(`Visit ${place.name}`),
              children: 'Visit',
            }}
            button2={{
              isPrimary: false,
              onClick: () => console.log(`Learn more about ${place.name}`),
              children: 'Learn More',
            }}
          >
            {place.description}
          </Card>
        ))}
      </Carousel>
    </div>
  );
});
CarouselResource.displayName = 'CarouselResource';
