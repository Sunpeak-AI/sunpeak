import './styles/globals.css';
import { createRoot } from 'react-dom/client';
import { CounterTool } from './components/tools/CounterTool';

// Mount the CounterTool
const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<CounterTool />);
}
