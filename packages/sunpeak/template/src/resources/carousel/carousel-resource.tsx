import * as React from 'react';
import { useWidgetProps, useSafeArea, useMaxHeight, useUserAgent } from 'sunpeak';
import { Carousel, Card } from './components';

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
  const safeArea = useSafeArea();
  const maxHeight = useMaxHeight();
  const userAgent = useUserAgent();

  const hasTouch = userAgent?.capabilities.touch ?? false;

  return (
    <div
      ref={ref}
      style={{
        paddingTop: `${safeArea?.insets.top ?? 0}px`,
        paddingBottom: `${safeArea?.insets.bottom ?? 0}px`,
        paddingLeft: `${safeArea?.insets.left ?? 0}px`,
        paddingRight: `${safeArea?.insets.right ?? 0}px`,
        maxHeight: maxHeight ?? undefined,
      }}
    >
      <Carousel gap={16} showArrows={true} showEdgeGradients={true} cardWidth={220}>
        {(data.places || []).map((place: CarouselCard) => (
          <Card
            key={place.id}
            image={place.image}
            imageAlt={place.name}
            header={place.name}
            metadata={`⭐ ${place.rating} • ${place.category} • ${place.location}`}
            buttonSize={hasTouch ? 'md' : 'sm'}
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
