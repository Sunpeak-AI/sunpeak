import {
  useApp,
  useToolData,
  useSafeArea,
  useViewport,
  useHostContext,
  useDisplayMode,
} from 'sunpeak';
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

interface CarouselData {
  places: CarouselCard[];
}

export function CarouselResource() {
  const { app } = useApp({
    appInfo: { name: 'CarouselResource', version: '1.0.0' },
    capabilities: {},
  });

  const { output } = useToolData<unknown, CarouselData>(app, undefined, { places: [] });
  const safeArea = useSafeArea(app);
  const viewport = useViewport(app);
  const context = useHostContext(app);
  const displayMode = useDisplayMode(app);

  const hasTouch = context?.deviceCapabilities?.touch ?? false;
  const places = output?.places ?? [];

  return (
    <div
      style={{
        paddingTop: `${safeArea.top}px`,
        paddingBottom: `${safeArea.bottom}px`,
        paddingLeft: `${safeArea.left}px`,
        paddingRight: `${safeArea.right}px`,
        maxHeight: viewport?.maxHeight ?? undefined,
      }}
    >
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
    </div>
  );
}
