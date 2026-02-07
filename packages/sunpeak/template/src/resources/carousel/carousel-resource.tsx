import { useToolData, useHostContext, useDisplayMode, SafeArea } from 'sunpeak';
import type { ResourceConfig } from 'sunpeak';
import { Carousel, Card } from './components';

export const resource: ResourceConfig = {
  name: 'carousel',
  title: 'Carousel',
  description: 'Show popular places to visit widget',
  mimeType: 'text/html;profile=mcp-app',
  _meta: {
    ui: {
      domain: 'https://sunpeak.ai',
      csp: {
        resourceDomains: ['https://cdn.sunpeak.ai', 'https://cdn.openai.com'],
      },
    },
  },
};

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

interface CarouselData {
  places: CarouselCard[];
}

export function CarouselResource() {
  const { output } = useToolData<unknown, CarouselData>(undefined, { places: [] });
  const context = useHostContext();
  const displayMode = useDisplayMode();

  const hasTouch = context?.deviceCapabilities?.touch ?? false;
  const places = output?.places ?? [];

  return (
    <SafeArea>
      <Carousel
        gap={16}
        showArrows={true}
        showEdgeGradients={true}
        cardWidth={220}
        displayMode={displayMode}
      >
        {places.map((place: CarouselCard) => (
          <Card
            key={place.id}
            image={place.image}
            imageAlt={place.name}
            header={place.name}
            metadata={`\u2B50 ${place.rating} \u2022 ${place.category} \u2022 ${place.location}`}
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
    </SafeArea>
  );
}
