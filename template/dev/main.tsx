import '../src/styles/globals.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ChatGPTSimulator } from 'sunpeak';
import { simulations } from '../src/simulations';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ChatGPTSimulator
      simulations={simulations}
      appName="Sunpeak App"
      appIcon="🌄"
    />
  </StrictMode>
);
