import { useWidgetProps } from 'sunpeak';
import { SunpeakCarousel, SunpeakCard } from './components';
import 'tw-animate-css';
import '@/styles/globals.css';
import '@/styles/chatgpt.css';

export interface Place {
  id: string;
  name: string;
  rating: number;
  category: string;
  location: string;
  image: string;
  description: string;
}

export interface AppData extends Record<string, unknown> {
  places: Place[];
}

export function App() {
  const data = useWidgetProps<AppData>(() => ({ places: [] }));

  return (
    <SunpeakCarousel gap={16} showArrows={true} showEdgeGradients={true} cardWidth={220}>
      {data.places.map((place) => (
        <SunpeakCard
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
        </SunpeakCard>
      ))}
    </SunpeakCarousel>
  );
}
