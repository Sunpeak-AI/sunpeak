import ReactDOM from 'react-dom/client';
import { ChatGPTSimulator } from '../../src/components/ChatGPTSimulator';
import { Carousel, Card } from 'sunpeak';
import { useWidgetState } from '../../src/hooks';
import '../../src/styles/themes.css';

const places = [
  {
    id: '1',
    name: 'Zilker Park',
    rating: 4.7,
    category: 'Park',
    location: 'Austin',
    image: 'https://images.unsplash.com/photo-1563828568124-f800803ba13c?w=400&h=400&fit=crop',
    description: 'Popular park with trails, sports fields, and Barton Springs Pool.',
  },
  {
    id: '2',
    name: 'South Congress Avenue',
    rating: 4.6,
    category: 'Landmark',
    location: 'Austin',
    image: 'https://images.unsplash.com/photo-1588993608283-7f0eda4438be?w=400&h=400&fit=crop',
    description: 'Vibrant street with unique shops, restaurants, and live music.',
  },
  {
    id: '3',
    name: 'Texas State Capitol',
    rating: 4.8,
    category: 'Historic Site',
    location: 'Austin',
    image: 'https://images.unsplash.com/photo-1664231978322-4d0b45c7027b?w=400&h=400&fit=crop',
    description: 'Stunning capitol building with free tours and beautiful grounds.',
  },
  {
    id: '4',
    name: 'Lady Bird Lake',
    rating: 4.5,
    category: 'Waterfront',
    location: 'Austin',
    image: 'https://images.unsplash.com/photo-1520950237264-dfe336995c34?w=400&h=400&fit=crop',
    description: 'Scenic lake perfect for kayaking, paddleboarding, and trails.',
  },
  {
    id: '5',
    name: 'The Paramount Theatre',
    rating: 4.7,
    category: 'Architecture',
    location: 'Austin',
    image: 'https://images.unsplash.com/photo-1583097090970-4d3b940ea1a0?w=400&h=400&fit=crop',
    description: 'Century-old performance and movie theatre in the heart of downtown Austin.',
  },
];

type UISimulation = string;

function App() {
  return (
    <ChatGPTSimulator
      userMessage="Show me popular places to visit in Austin Texas"
      displayMode="inline"
      colorScheme="dark"
      uiSimulations={['Carousel', 'Card']}
      initialUISimulation="Carousel"
    >
      {(selectedUI) => <AppContent selectedUI={selectedUI} />}
    </ChatGPTSimulator>
  );
}

function AppContent({ selectedUI }: { selectedUI: UISimulation }) {
  const [_cardState] = useWidgetState<{ selectedCardId?: string }>({});

  // Card simulation - show a single card
  if (selectedUI === 'Card') {
    const simulationPlace = places[0]; // Use first place as simulation
    return (
      <div style={{ padding: '16px', display: 'flex', justifyContent: 'center' }}>
        <Card
          id={simulationPlace.id}
          image={simulationPlace.image}
          imageAlt={simulationPlace.name}
          imageMaxWidth={400}
          imageMaxHeight={400}
          header={simulationPlace.name}
          metadata={`⭐ ${simulationPlace.rating} · ${simulationPlace.category} · ${simulationPlace.location}`}
          variant="elevated"
          button1={{
            children: 'Learn more',
            onClick: () => console.log(`Learn more about ${simulationPlace.name}`),
            isPrimary: true,
          }}
        >
          {simulationPlace.description}
        </Card>
      </div>
    );
  }

  return (
    <Carousel>
      {places.map((place) => (
        <div key={place.id} className="sp-carousel-item">
          <Card
            id={place.id}
            image={place.image}
            imageAlt={place.name}
            imageMaxWidth={400}
            imageMaxHeight={400}
            header={place.name}
            metadata={`⭐ ${place.rating} · ${place.category} · ${place.location}`}
            variant="elevated"
            button1={{
              children: 'Learn more',
              onClick: () => console.log(`Learn more about ${place.name}`),
              isPrimary: true,
            }}
          >
            {place.description}
          </Card>
        </div>
      ))}
    </Carousel>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
