import './styles/globals.css';
import { createRoot } from 'react-dom/client';
import { CounterResource } from './components/resources/CounterResource';

// Mount the CounterResource
const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<CounterResource />);
}
