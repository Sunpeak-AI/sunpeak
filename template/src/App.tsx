import { SunpeakCarousel, SunpeakCard } from './components';
import './styles/chatgpt/index.css';

export interface Place {
  id: string;
  name: string;
  rating: number;
  category: string;
  location: string;
  image: string;
  description: string;
}

export interface AppProps {
  data: Place[];
}

export function App({ data }: AppProps) {
  return (
    <SunpeakCarousel gap={16} showArrows={true} showEdgeGradients={true} cardWidth={280}>
      {data.map((place) => (
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
