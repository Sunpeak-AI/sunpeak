import './styles/globals.css';
import { createRoot } from 'react-dom/client';
import { CarouselResource } from './components/resources/CarouselResource';

// Mount the CarouselResource
const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<CarouselResource />);
}
