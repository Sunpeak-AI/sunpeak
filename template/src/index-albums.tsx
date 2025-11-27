import './styles/globals.css';
import { createRoot } from 'react-dom/client';
import { AlbumsTool } from './components/tools/AlbumsTool';

// Mount the AlbumsTool
const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<AlbumsTool />);
}
