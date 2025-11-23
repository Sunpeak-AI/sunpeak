import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ChatGPTSimulator } from 'sunpeak';
import { App } from '@/App';

const toolOutput = {
  places: [
    {
      id: '1',
      name: 'Lady Bird Lake',
      rating: 4.5,
      category: 'Waterfront',
      location: 'Austin',
      image: 'https://images.unsplash.com/photo-1520950237264-dfe336995c34?w=400&h=400&fit=crop',
      description: 'Scenic lake perfect for kayaking, paddleboarding, and trails.',
    },
    {
      id: '2',
      name: 'Texas State Capitol',
      rating: 4.8,
      category: 'Historic Site',
      location: 'Austin',
      image: 'https://images.unsplash.com/photo-1664231978322-4d0b45c7027b?w=400&h=400&fit=crop',
      description: 'Stunning capitol building with free tours and beautiful grounds.',
    },
    {
      id: '3',
      name: 'The Paramount Theatre',
      rating: 4.7,
      category: 'Architecture',
      location: 'Austin',
      image: 'https://images.unsplash.com/photo-1583097090970-4d3b940ea1a0?w=400&h=400&fit=crop',
      description: 'Century-old performance and movie theatre in the heart of downtown Austin.',
    },
    {
      id: '4',
      name: 'Zilker Park',
      rating: 4.7,
      category: 'Park',
      location: 'Austin',
      image: 'https://images.unsplash.com/photo-1563828568124-f800803ba13c?w=400&h=400&fit=crop',
      description: 'Popular park with trails, sports fields, and Barton Springs Pool.',
    },
    {
      id: '5',
      name: 'South Congress Avenue',
      rating: 4.6,
      category: 'Landmark',
      location: 'Austin',
      image: 'https://images.unsplash.com/photo-1588993608283-7f0eda4438be?w=400&h=400&fit=crop',
      description: 'Vibrant street with unique shops, restaurants, and live music.',
    },
  ],
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ChatGPTSimulator
      appName="Splorin"
      appIcon="✈️"
      userMessage="Show me popular places to visit in Austin Texas"
      toolOutput={toolOutput}
    >
      <App />
    </ChatGPTSimulator>
  </StrictMode>
);
