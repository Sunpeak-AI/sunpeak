import '../src/styles/globals.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ChatGPTSimulator, type Simulation } from 'sunpeak';
import { SIMULATIONS } from '../src/simulations';
import { CounterResource } from '../src/components/resources/CounterResource';
import { AlbumsResource } from '../src/components/resources/AlbumsResource';
import { CarouselResource } from '../src/components/resources/CarouselResource';

const simulations: Simulation[] = [
  {
    ...SIMULATIONS.counter,
    resourceComponent: CounterResource,
  },
  {
    ...SIMULATIONS.albums,
    resourceComponent: AlbumsResource,
  },
  {
    ...SIMULATIONS.carousel,
    resourceComponent: CarouselResource,
  },
];

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ChatGPTSimulator
      simulations={simulations}
      appName="Sunpeak App"
      appIcon="🌄"
    />
  </StrictMode>
);
