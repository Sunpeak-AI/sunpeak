import { createRoot } from 'react-dom/client';
import { App } from './App';

// Mount the App to the root element
const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<App />);
}
