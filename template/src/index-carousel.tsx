import './styles/globals.css';
import { createRoot } from 'react-dom/client';
import { PlacesTool } from './components/tools/PlacesTool';

// Mount the PlacesTool
const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<PlacesTool />);
}
