import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ChatGPTSimulator } from 'sunpeak';
import { simulations } from '../src/components';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ChatGPTSimulator simulations={simulations} />
  </StrictMode>
);
