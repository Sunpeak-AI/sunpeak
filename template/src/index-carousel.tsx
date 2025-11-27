import './styles/globals.css';
import { createRoot } from 'react-dom/client';
import { PlacesResource } from './components/resources/PlacesResource';

// Mount the PlacesResource
const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<PlacesResource />);
}
