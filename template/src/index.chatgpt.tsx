import { createRoot } from 'react-dom/client';
import { ActiveComponent as ActiveApp } from './simulations/simulations';

// Mount the active app
// To switch apps, edit ACTIVE_APP in components/apps/active-app.ts
const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<ActiveApp />);
}
