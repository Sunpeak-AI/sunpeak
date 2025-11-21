import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ChatGPTSimulator } from 'sunpeak';
import 'sunpeak/styles/chatgpt';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ChatGPTSimulator>
      <App />
    </ChatGPTSimulator>
  </StrictMode>
);
