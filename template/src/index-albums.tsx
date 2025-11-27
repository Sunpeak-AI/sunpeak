import './styles/globals.css';
import { createRoot } from 'react-dom/client';
import { AlbumsResource } from './components/resources/AlbumsResource';

// Mount the AlbumsResource
const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<AlbumsResource />);
}
